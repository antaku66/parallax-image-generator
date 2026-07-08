// レイヤー生成（実装ガイド §13/§14）。
// 再帰的 Otsu が返すしきい値 t_1 < … < t_{K-1} と累積マスク M_k から
// N 層の Layered Depth Image を組み立てる。統一スキーム:
//   レイヤー k = 「t_{k+1} より手前（M_{k+1}）を穴としてインペイントした画像」を M_k でマット
//   - 最背面 (k=0): 全ての手前領域を除去してインペイントした「完全な背景」（不透明メッシュ）
//   - 中間層: 自スラブの切り抜き + 手前領域を自スラブの延長色で穴埋め
//   - 最前面 (k=K-1): 被写体の切り抜き（アルファマット）
// 同一 depthScale で配置し、視差は Z 差から自然に生じる。
// 深度が連続的な画像（分割ゲート不通過）は分割せず、不連続カリング付きの連続メッシュ 1 枚で表現する。
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
  /** レイヤー数の上限（tier 別。IMAGE_LIMITS[tier].maxLayers） */
  maxLayers?: number;
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

/** 手前マスクをテクスチャ解像度へエッジ整合拡大・膨張し、2 値の穴マスクにする（フリンジを穴に含める） */
function holeFromNearer(
  nearer: Float32Array,
  dw: number,
  dh: number,
  rgba: ImageData
): Float32Array {
  const w = rgba.width;
  const h = rgba.height;
  const nearAtTex = dilateMax(upsampleMatte(nearer, dw, dh, rgba), w, h, PIPELINE_DEFAULTS.inpaintDilate);
  const hole = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) hole[i] = nearAtTex[i] > 0.5 ? 1 : 0;
  return hole;
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

/**
 * 最背面レイヤー: nearer（手前の累積マスク）の領域を穴として完全インペイントした
 * 不透明メッシュ（+ 外周ガター）。nearer=null は分割なしの単層シーン。
 */
async function buildBackLayer(
  opts: BuildLayersOptions,
  nearer: Float32Array | null,
  textureSide: number,
  id: string,
  depthRange: [number, number]
): Promise<SceneLayer> {
  const { depth, display, gridX, gridY, depthScale } = opts;
  const [w, h] = fitDims(display.width, display.height, textureSide);
  const rgba = bitmapToImageData(display, w, h);
  const hole = nearer ? holeFromNearer(nearer, depth.width, depth.height, rgba) : null;
  // 手前の穴と外周ガターを 1 回の push-pull で補完（遮蔽穴とフレーム外露出を同時に解消）
  const { image, sx, sy } = inpaintWithGutter(rgba, hole);
  const texture = await createImageBitmap(image, { premultiplyAlpha: "none" });

  // ジオメトリ: 手前領域の深度もインペイントし外周へ延長
  let depthHole: Float32Array | null = null;
  if (nearer) {
    depthHole = new Float32Array(depth.width * depth.height);
    for (let i = 0; i < depthHole.length; i++) depthHole[i] = nearer[i] > 0.3 ? 1 : 0;
  }
  const mesh = buildDepthMesh({
    depth: inpaintDepthWithGutter(depth, depthHole),
    gridX,
    gridY,
    depthScale,
    // 分割時は切らない（穴を作らない）完全メッシュ。単層は不連続カリングで裂けを防ぐ
    discontinuityThreshold: nearer ? 1 : PIPELINE_DEFAULTS.discontinuityThreshold,
  });
  scaleMeshXY(mesh, sx, sy);
  return { id, depthRange, texture, mesh, parallax: 1 };
}

/**
 * マットレイヤー: 累積マスク cum の near 側を切り抜く。
 * nearer が非 null の中間層は、さらに手前の領域を穴として自スラブの延長色で埋める
 * （手前レイヤーがずれて露出したとき、奥の色ではなく自スラブの色が見える）。
 */
async function buildMatteLayer(
  opts: BuildLayersOptions,
  cum: Float32Array,
  nearer: Float32Array | null,
  textureSide: number,
  id: string,
  depthRange: [number, number]
): Promise<SceneLayer> {
  const { depth, display, gridX, gridY, depthScale } = opts;
  const dw = depth.width;
  const dh = depth.height;
  const [w, h] = fitDims(display.width, display.height, textureSide);
  const rgba = bitmapToImageData(display, w, h);
  // エッジ整合拡大 + チョーク（外縁の混合画素＝奥の色が混ざったリムをアルファから削る）
  const alpha = erodeMin(upsampleMatte(cum, dw, dh, rgba), w, h, PIPELINE_DEFAULTS.fgAlphaErode);
  const hole = nearer ? holeFromNearer(nearer, dw, dh, rgba) : null;

  // 1 回の push-pull を穴埋めと色デコンタミネーションで共用する。
  // known = 純粋な自レイヤー色（アルファが高く、かつ穴でない画素）
  const known = new Float32Array(w * h);
  const rgb = new Float32Array(w * h * 3);
  for (let i = 0; i < w * h; i++) {
    known[i] = alpha[i] >= PIPELINE_DEFAULTS.fgKnownAlpha && !(hole && hole[i] > 0) ? 1 : 0;
    rgb[i * 3] = rgba.data[i * 4] / 255;
    rgb[i * 3 + 1] = rgba.data[i * 4 + 1] / 255;
    rgb[i * 3 + 2] = rgba.data[i * 4 + 2] / 255;
  }
  const filled = pushPullInpaint(rgb, known, w, h, 3);
  for (let i = 0; i < w * h; i++) {
    const t = clamp(alpha[i], 0, 1);
    // 穴内は手前レイヤーの色を残さず延長色で全置換。それ以外は色デコンタミネーション:
    // アルファが低いエッジ帯ほど内部色へ寄せ、半透明リムに焼き込まれた奥の色
    // （視差移動時に縁取りとして見える）を除去する（α≥fgKnownAlpha では元色のまま）。
    const mix = hole && hole[i] > 0 ? 0 : t;
    rgba.data[i * 4] = (rgb[i * 3] + (clamp(filled[i * 3], 0, 1) - rgb[i * 3]) * (1 - mix)) * 255;
    rgba.data[i * 4 + 1] =
      (rgb[i * 3 + 1] + (clamp(filled[i * 3 + 1], 0, 1) - rgb[i * 3 + 1]) * (1 - mix)) * 255;
    rgba.data[i * 4 + 2] =
      (rgb[i * 3 + 2] + (clamp(filled[i * 3 + 2], 0, 1) - rgb[i * 3 + 2]) * (1 - mix)) * 255;
    rgba.data[i * 4 + 3] = t * 255;
  }
  const texture = await createImageBitmap(rgba, { premultiplyAlpha: "none" });

  // レイヤー専用深度: 自スラブの帯（cum の near 側かつ nearer の far 側）を known として
  // push-pull。マスク外のスカート平坦化と穴内の深度延長を同時に行い、シルエットを跨ぐ
  // 境界三角形が奥の深度まで引き伸ばされる「膜」を防ぐ。
  const knownDepth = new Float32Array(dw * dh);
  for (let i = 0; i < dw * dh; i++) {
    knownDepth[i] = cum[i] >= 0.5 && !(nearer && nearer[i] >= 0.5) ? 1 : 0;
  }
  const layerDepth: FloatDepthMap = {
    kind: "float32",
    width: dw,
    height: dh,
    data: pushPullInpaint(depth.data, knownDepth, dw, dh, 1),
  };
  const maskMap: FloatDepthMap = { kind: "float32", width: dw, height: dh, data: cum };
  const mesh = buildDepthMesh({
    depth: layerDepth,
    gridX,
    gridY,
    depthScale,
    // スラブ内部に穴を作らないよう緩めのしきい値。切れ目はアルファマットが担う。
    discontinuityThreshold: PIPELINE_DEFAULTS.fgDiscontinuityThreshold,
    mask: maskMap,
    maskKeepThreshold: 0.5,
  });
  return { id, depthRange, texture, mesh, parallax: 1 };
}

export async function buildLayers(opts: BuildLayersOptions): Promise<SceneLayer[]> {
  const { depth, maxLayers = 4 } = opts;
  const { thresholds, cumulativeMasks } = splitDepthLayers(depth, { maxLayers });

  // 分割ゲート不通過（深度が連続的）: 連続メッシュ 1 枚で表現
  if (thresholds.length === 0) {
    return [await buildBackLayer(opts, null, PIPELINE_DEFAULTS.fgTextureSide, "scene", [0, 1])];
  }

  const layers: SceneLayer[] = [
    await buildBackLayer(opts, cumulativeMasks[0], PIPELINE_DEFAULTS.bgTextureSide, "bg", [
      0,
      thresholds[0],
    ]),
  ];
  for (let i = 0; i < thresholds.length; i++) {
    const isFront = i === thresholds.length - 1;
    layers.push(
      await buildMatteLayer(
        opts,
        cumulativeMasks[i],
        isFront ? null : cumulativeMasks[i + 1],
        isFront ? PIPELINE_DEFAULTS.fgTextureSide : PIPELINE_DEFAULTS.midTextureSide,
        isFront ? "fg" : `mid${i + 1}`,
        [thresholds[i], isFront ? 1 : thresholds[i + 1]]
      )
    );
  }
  return layers;
}
