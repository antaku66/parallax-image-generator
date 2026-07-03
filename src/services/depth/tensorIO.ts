// テンソル入出力（Depth Anything V2）。
// 入力: pixel_values [1,3,H,W] float32 NCHW RGB（ImageNet 正規化）
// 出力: predicted_depth [1,H,W]（大きい=近い）
// モデルは動的軸対応のため、アスペクト比を保ったまま両辺 14 の倍数で推論する。

import * as ort from "onnxruntime-web/webgpu";
import type { FloatDepthMap } from "../../types";
import { IMAGENET_NORMALIZATION } from "../../constants/models";
import { bitmapToImageData } from "../image/canvas";

/** ViT patch サイズ(14) の倍数へスナップ */
export function snapToPatch(side: number, patch = 14): number {
  return Math.max(patch, Math.round(side / patch) * patch);
}

/**
 * アスペクト比を保ち、長辺を maxSide 以下（拡大なし）・両辺を patch の倍数にした
 * 推論寸法 [width, height] を求める。
 */
export function inferenceDims(
  width: number,
  height: number,
  maxSide: number
): [number, number] {
  const scale = Math.min(1, maxSide / Math.max(width, height));
  return [snapToPatch(width * scale), snapToPatch(height * scale)];
}

function normalizeToCHW(imageData: ImageData): Float32Array {
  const { data, width, height } = imageData;
  const area = width * height;
  const chw = new Float32Array(3 * area);
  const { mean, std } = IMAGENET_NORMALIZATION;
  for (let p = 0; p < area; p++) {
    const r = data[p * 4] / 255;
    const g = data[p * 4 + 1] / 255;
    const b = data[p * 4 + 2] / 255;
    chw[p] = (r - mean[0]) / std[0];
    chw[area + p] = (g - mean[1]) / std[1];
    chw[2 * area + p] = (b - mean[2]) / std[2];
  }
  return chw;
}

/** 入力画像をアスペクト比保持でテンソル化する。maxSide は推論長辺の上限。 */
export async function inputToTensor(
  input: ImageBitmap | ImageData,
  maxSide: number
): Promise<ort.Tensor> {
  const [w, h] = inferenceDims(input.width, input.height, maxSide);
  let imageData: ImageData;
  if (input instanceof ImageData) {
    const bmp = await createImageBitmap(input);
    imageData = bitmapToImageData(bmp, w, h);
    bmp.close();
  } else {
    imageData = bitmapToImageData(input, w, h);
  }
  const chw = normalizeToCHW(imageData);
  return new ort.Tensor("float32", chw, [1, 3, h, w]);
}

/** 出力テンソル → 生の FloatDepthMap（未正規化） */
export function outputToDepthMap(output: ort.Tensor): FloatDepthMap {
  const dims = output.dims;
  let width: number;
  let height: number;
  if (dims.length === 4) {
    height = dims[2];
    width = dims[3];
  } else if (dims.length === 3) {
    height = dims[1];
    width = dims[2];
  } else if (dims.length === 2) {
    height = dims[0];
    width = dims[1];
  } else {
    throw new Error(`想定外の深度出力形状: [${dims.join(",")}]`);
  }
  const raw = output.data as Float32Array;
  return { kind: "float32", width, height, data: Float32Array.from(raw) };
}
