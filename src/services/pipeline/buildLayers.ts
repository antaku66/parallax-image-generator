// レイヤー生成（実装ガイド §13/§14）。
// 遮蔽で生じる穴を根本解消するため、前景/背景を分離し、
//   背景: 前景を除去してインペイントした「完全な背景」（不透明メッシュ）
//   前景: 被写体の切り抜き（アルファマット + メッシュカリング）
// を作る。同一 depthScale で配置し、視差は Z 差から自然に生じる。

import type { FloatDepthMap, SceneLayer } from "../../types";
import { PIPELINE_DEFAULTS } from "../../constants/pipeline";
import { clamp } from "../../utils/clamp";
import { bitmapToImageData } from "../image/canvas";
import { splitDepthLayers } from "./splitDepthLayers";
import { pushPullInpaint } from "./pushPullInpaint";
import { upsampleBilinear, dilateMax } from "./maskOps";
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

export async function buildLayers(opts: BuildLayersOptions): Promise<SceneLayer[]> {
  const { depth, display, gridX, gridY, depthScale } = opts;
  const dw = depth.width;
  const dh = depth.height;
  const { threshold, foreground } = splitDepthLayers(depth, PIPELINE_DEFAULTS.splitMargin);

  // ---- 背景レイヤー: 前景を除去してインペイントした完全な背景 ----
  const [bgW, bgH] = fitDims(display.width, display.height, PIPELINE_DEFAULTS.bgTextureSide);
  const bgRgba = bitmapToImageData(display, bgW, bgH);
  // 前景マスクを背景解像度へ拡大し膨張（被写体フリンジを穴に含める）
  const fgAtBg = dilateMax(
    upsampleBilinear(foreground, dw, dh, bgW, bgH),
    bgW,
    bgH,
    PIPELINE_DEFAULTS.inpaintDilate
  );
  const knownBg = new Float32Array(bgW * bgH);
  const rgb = new Float32Array(bgW * bgH * 3);
  for (let i = 0; i < bgW * bgH; i++) {
    knownBg[i] = fgAtBg[i] > 0.5 ? 0 : 1; // 前景 = 穴
    rgb[i * 3] = bgRgba.data[i * 4] / 255;
    rgb[i * 3 + 1] = bgRgba.data[i * 4 + 1] / 255;
    rgb[i * 3 + 2] = bgRgba.data[i * 4 + 2] / 255;
  }
  const filled = pushPullInpaint(rgb, knownBg, bgW, bgH, 3);
  const bgImage = new ImageData(bgW, bgH);
  for (let i = 0; i < bgW * bgH; i++) {
    bgImage.data[i * 4] = clamp(filled[i * 3], 0, 1) * 255;
    bgImage.data[i * 4 + 1] = clamp(filled[i * 3 + 1], 0, 1) * 255;
    bgImage.data[i * 4 + 2] = clamp(filled[i * 3 + 2], 0, 1) * 255;
    bgImage.data[i * 4 + 3] = 255;
  }
  const bgTexture = await createImageBitmap(bgImage);

  // 背景ジオメトリ: 前景領域の深度もインペイントして滑らかに（カリング無し=完全メッシュ）
  const knownDepth = new Float32Array(dw * dh);
  for (let i = 0; i < dw * dh; i++) knownDepth[i] = foreground[i] > 0.3 ? 0 : 1;
  const bgDepthData = pushPullInpaint(depth.data, knownDepth, dw, dh, 1);
  const bgDepth: FloatDepthMap = { kind: "float32", width: dw, height: dh, data: bgDepthData };
  const bgMesh = buildDepthMesh({
    depth: bgDepth,
    gridX,
    gridY,
    depthScale,
    discontinuityThreshold: 1, // 背景は切らない（穴を作らない）
  });

  // ---- 前景レイヤー: 被写体の切り抜き（アルファマット + メッシュカリング）----
  const [fgW, fgH] = fitDims(display.width, display.height, PIPELINE_DEFAULTS.fgTextureSide);
  const fgRgba = bitmapToImageData(display, fgW, fgH);
  const fgAlpha = upsampleBilinear(foreground, dw, dh, fgW, fgH);
  for (let i = 0; i < fgW * fgH; i++) fgRgba.data[i * 4 + 3] = clamp(fgAlpha[i], 0, 1) * 255;
  const fgTexture = await createImageBitmap(fgRgba);
  const fgMaskMap: FloatDepthMap = { kind: "float32", width: dw, height: dh, data: foreground };
  const fgMesh = buildDepthMesh({
    depth,
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
