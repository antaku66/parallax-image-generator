// レイヤー生成（実装ガイド §13/§14）。
// 深度分布が二峰的な画像は前景/背景を分離し、
//   背景: 前景を除去してインペイントした「完全な背景」（不透明メッシュ）
//   前景: 被写体の切り抜き（アルファマット）
// を作る。同一 depthScale で配置し、視差は Z 差から自然に生じる。
// 深度が連続的な画像（風景等）は分割せず、不連続カリング付きの連続メッシュ 1 枚で表現する。
// 最背面レイヤーは外周ガター（インペイント余白）を持ち、視差移動時のフレーム外露出を防ぐ。

import type { FloatDepthMap, SceneLayer, SceneMesh } from "../../types";
import { PIPELINE_DEFAULTS } from "../../constants/pipeline";
import { clamp } from "../../utils/clamp";
import { bitmapToImageData, luminanceFromImageData } from "../image/canvas";
import { splitDepthLayers } from "./splitDepthLayers";
import { pushPullInpaint } from "./pushPullInpaint";
import { guidedFilter } from "./refineDepth";
import { upsampleBilinear, dilateMax, erodeMin } from "./maskOps";
import { buildDepthMesh } from "./buildDepthMesh";

export type BuildLayersOptions = {
  depth: FloatDepthMap; // refined 深度（0=far/1=near）
  display: ImageBitmap; // 表示テクスチャ源
  gridX: number;
  gridY: number;
  depthScale: number;
};

function fitDims(w: number, h: number, maxSide: number): [number, number] {
  const s = Math.min(1, maxSide / Math.max(w, h));
  return [Math.max(1, Math.round(w * s)), Math.max(1, Math.round(h * s))];
}

/** 深度解像度→テクスチャ解像度の拡大率に応じた guided filter 半径 */
function matteRadius(dstW: number, srcW: number): number {
  return Math.max(1, Math.round((dstW / srcW) * PIPELINE_DEFAULTS.matteRadiusFactor));
}

/**
 * 深度解像度のソフトマスクをテクスチャ解像度へエッジ整合アップサンプリングする。
 * 双線形拡大で広がった遷移帯を、輝度ガイドの guided filter で実シルエットへ吸着させる。
 */
function upsampleMatte(
  mask: Float32Array,
  sw: number,
  sh: number,
  guideImage: ImageData
): Float32Array {
  const dw = guideImage.width;
  const dh = guideImage.height;
  return guidedFilter(
    upsampleBilinear(mask, sw, sh, dw, dh),
    luminanceFromImageData(guideImage),
    dw,
    dh,
    matteRadius(dw, sw),
    PIPELINE_DEFAULTS.matteEps
  );
}

/** 外周ガターの余白幅(px)。interior 比 bgGutter を各解像度で確保する */
function gutterPx(side: number): number {
  return Math.max(1, Math.round(side * PIPELINE_DEFAULTS.bgGutter));
}

/**
 * interior の RGB を外周ガター分拡張し、穴（hole=1）と余白を push-pull で補完した
 * ImageData を返す。sx/sy は interior に対する拡張後の寸法比（メッシュ側の位置スケールに使う）。
 */
function inpaintWithGutter(
  rgba: ImageData,
  hole: Float32Array | null
): { image: ImageData; sx: number; sy: number } {
  const w = rgba.width;
  const h = rgba.height;
  const mx = gutterPx(w);
  const my = gutterPx(h);
  const ew = w + 2 * mx;
  const eh = h + 2 * my;
  const known = new Float32Array(ew * eh); // 余白は 0（未知）のまま
  const rgb = new Float32Array(ew * eh * 3);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const src = y * w + x;
      const dst = (y + my) * ew + (x + mx);
      known[dst] = hole && hole[src] > 0.5 ? 0 : 1;
      rgb[dst * 3] = rgba.data[src * 4] / 255;
      rgb[dst * 3 + 1] = rgba.data[src * 4 + 1] / 255;
      rgb[dst * 3 + 2] = rgba.data[src * 4 + 2] / 255;
    }
  }
  const filled = pushPullInpaint(rgb, known, ew, eh, 3);
  const image = new ImageData(ew, eh);
  for (let i = 0; i < ew * eh; i++) {
    image.data[i * 4] = clamp(filled[i * 3], 0, 1) * 255;
    image.data[i * 4 + 1] = clamp(filled[i * 3 + 1], 0, 1) * 255;
    image.data[i * 4 + 2] = clamp(filled[i * 3 + 2], 0, 1) * 255;
    image.data[i * 4 + 3] = 255;
  }
  return { image, sx: ew / w, sy: eh / h };
}

/** 深度マップを外周ガター分拡張し、穴（hole=1）と余白を push-pull で補完する */
function inpaintDepthWithGutter(depth: FloatDepthMap, hole: Float32Array | null): FloatDepthMap {
  const { width: w, height: h, data } = depth;
  const mx = gutterPx(w);
  const my = gutterPx(h);
  const ew = w + 2 * mx;
  const eh = h + 2 * my;
  const known = new Float32Array(ew * eh);
  const ext = new Float32Array(ew * eh);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const src = y * w + x;
      const dst = (y + my) * ew + (x + mx);
      known[dst] = hole && hole[src] > 0.5 ? 0 : 1;
      ext[dst] = data[src];
    }
  }
  return {
    kind: "float32",
    width: ew,
    height: eh,
    data: pushPullInpaint(ext, known, ew, eh, 1),
  };
}

/** ガター拡張率をメッシュ頂点位置へ焼き込む（interior が [-0.5,0.5] を占め、余白が外へ延びる） */
function scaleMeshXY(mesh: SceneMesh, sx: number, sy: number): void {
  for (let i = 0; i < mesh.vertexCount; i++) {
    mesh.positions[i * 3] *= sx;
    mesh.positions[i * 3 + 1] *= sy;
  }
}

/** 単層シーン: 深度が連続的な画像向け。分割せず連続メッシュ 1 枚（+ ガター）で表現する */
async function buildSingleLayer(opts: BuildLayersOptions): Promise<SceneLayer> {
  const { depth, display, gridX, gridY, depthScale } = opts;
  const [w, h] = fitDims(display.width, display.height, PIPELINE_DEFAULTS.fgTextureSide);
  const rgba = bitmapToImageData(display, w, h);
  const { image, sx, sy } = inpaintWithGutter(rgba, null);
  const texture = await createImageBitmap(image, { premultiplyAlpha: "none" });
  const mesh = buildDepthMesh({
    depth: inpaintDepthWithGutter(depth, null),
    gridX,
    gridY,
    depthScale,
    discontinuityThreshold: PIPELINE_DEFAULTS.discontinuityThreshold,
  });
  scaleMeshXY(mesh, sx, sy);
  return { id: "scene", depthRange: [0, 1], texture, mesh, parallax: 1 };
}

export async function buildLayers(opts: BuildLayersOptions): Promise<SceneLayer[]> {
  const { depth, display, gridX, gridY, depthScale } = opts;
  const dw = depth.width;
  const dh = depth.height;
  const { threshold, foreground, separability } = splitDepthLayers(
    depth,
    PIPELINE_DEFAULTS.splitMargin
  );

  // 深度分布が連続的（二峰でない）な画像では、2 層分割が「一枚の面が裂ける」破綻を生む。
  // 分離度が低い場合は分割を放棄し、連続メッシュ 1 枚へフォールバックする。
  if (separability < PIPELINE_DEFAULTS.minSplitSeparability) {
    return [await buildSingleLayer(opts)];
  }

  // ---- 背景レイヤー: 前景を除去してインペイントした完全な背景 ----
  const [bgW, bgH] = fitDims(display.width, display.height, PIPELINE_DEFAULTS.bgTextureSide);
  const bgRgba = bitmapToImageData(display, bgW, bgH);
  // 前景マスクを背景解像度へエッジ整合拡大し膨張（被写体フリンジを穴に含める）
  const fgAtBg = dilateMax(
    upsampleMatte(foreground, dw, dh, bgRgba),
    bgW,
    bgH,
    PIPELINE_DEFAULTS.inpaintDilate
  );
  const bgHole = new Float32Array(bgW * bgH);
  for (let i = 0; i < bgW * bgH; i++) bgHole[i] = fgAtBg[i] > 0.5 ? 1 : 0;
  // 前景の穴と外周ガターを 1 回の push-pull で補完（遮蔽穴とフレーム外露出を同時に解消）
  const { image: bgImage, sx, sy } = inpaintWithGutter(bgRgba, bgHole);
  const bgTexture = await createImageBitmap(bgImage, { premultiplyAlpha: "none" });

  // 背景ジオメトリ: 前景領域の深度もインペイントし外周へ延長（カリング無し=完全メッシュ）
  const depthHole = new Float32Array(dw * dh);
  for (let i = 0; i < dw * dh; i++) depthHole[i] = foreground[i] > 0.3 ? 1 : 0;
  const bgMesh = buildDepthMesh({
    depth: inpaintDepthWithGutter(depth, depthHole),
    gridX,
    gridY,
    depthScale,
    discontinuityThreshold: 1, // 背景は切らない（穴を作らない）
  });
  scaleMeshXY(bgMesh, sx, sy);

  // ---- 前景レイヤー: 被写体の切り抜き（アルファマット + メッシュカリング）----
  const [fgW, fgH] = fitDims(display.width, display.height, PIPELINE_DEFAULTS.fgTextureSide);
  const fgRgba = bitmapToImageData(display, fgW, fgH);
  // エッジ整合拡大 + チョーク（外縁の混合画素＝背景色が混ざったリムをアルファから削る）
  const fgAlpha = erodeMin(
    upsampleMatte(foreground, dw, dh, fgRgba),
    fgW,
    fgH,
    PIPELINE_DEFAULTS.fgAlphaErode
  );
  // 色デコンタミネーション: 被写体内部色をエッジ帯・透明域へ押し出し、
  // 半透明リムに焼き込まれた背景色（視差移動時に縁取りとして見える）を除去する
  const knownFg = new Float32Array(fgW * fgH);
  const fgRgb = new Float32Array(fgW * fgH * 3);
  for (let i = 0; i < fgW * fgH; i++) {
    knownFg[i] = fgAlpha[i] >= PIPELINE_DEFAULTS.fgKnownAlpha ? 1 : 0;
    fgRgb[i * 3] = fgRgba.data[i * 4] / 255;
    fgRgb[i * 3 + 1] = fgRgba.data[i * 4 + 1] / 255;
    fgRgb[i * 3 + 2] = fgRgba.data[i * 4 + 2] / 255;
  }
  const fgFilled = pushPullInpaint(fgRgb, knownFg, fgW, fgH, 3);
  for (let i = 0; i < fgW * fgH; i++) {
    const t = clamp(fgAlpha[i], 0, 1);
    // アルファが低いほど内部色へ寄せる（α≥fgKnownAlpha では元色のまま）
    fgRgba.data[i * 4] = (fgRgb[i * 3] + (clamp(fgFilled[i * 3], 0, 1) - fgRgb[i * 3]) * (1 - t)) * 255;
    fgRgba.data[i * 4 + 1] =
      (fgRgb[i * 3 + 1] + (clamp(fgFilled[i * 3 + 1], 0, 1) - fgRgb[i * 3 + 1]) * (1 - t)) * 255;
    fgRgba.data[i * 4 + 2] =
      (fgRgb[i * 3 + 2] + (clamp(fgFilled[i * 3 + 2], 0, 1) - fgRgb[i * 3 + 2]) * (1 - t)) * 255;
    fgRgba.data[i * 4 + 3] = t * 255;
  }
  const fgTexture = await createImageBitmap(fgRgba, { premultiplyAlpha: "none" });
  // 前景専用深度: マスク外を被写体深度の押し出しで置換（スカート平坦化）。
  // シルエットを跨ぐ境界三角形が背景深度まで引き伸ばされる「膜」を防ぐ。
  const fgKnownDepth = new Float32Array(dw * dh);
  for (let i = 0; i < dw * dh; i++) fgKnownDepth[i] = foreground[i] >= 0.5 ? 1 : 0;
  const fgDepth: FloatDepthMap = {
    kind: "float32",
    width: dw,
    height: dh,
    data: pushPullInpaint(depth.data, fgKnownDepth, dw, dh, 1),
  };
  const fgMaskMap: FloatDepthMap = { kind: "float32", width: dw, height: dh, data: foreground };
  const fgMesh = buildDepthMesh({
    depth: fgDepth,
    gridX,
    gridY,
    depthScale,
    // 被写体内部に穴を作らないよう緩めのしきい値。前景/背景の切れ目はアルファマットが担う。
    discontinuityThreshold: PIPELINE_DEFAULTS.fgDiscontinuityThreshold,
    mask: fgMaskMap,
    maskKeepThreshold: 0.5,
  });

  return [
    { id: "bg", depthRange: [0, threshold], texture: bgTexture, mesh: bgMesh, parallax: 1 },
    { id: "fg", depthRange: [threshold, 1], texture: fgTexture, mesh: fgMesh, parallax: 1 },
  ];
}
