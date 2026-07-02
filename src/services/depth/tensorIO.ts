// テンソル入出力（Depth Anything V2）。
// 入力: pixel_values [1,3,H,W] float32 NCHW RGB（ImageNet 正規化）
// 出力: predicted_depth [1,H,W]（大きい=近い）

import * as ort from "onnxruntime-web/webgpu";
import type { FloatDepthMap } from "../../types";
import { IMAGENET_NORMALIZATION } from "../../constants/models";
import { bitmapToImageData } from "../image/canvas";

/** ViT patch サイズ(14) の倍数へスナップ */
export function snapToPatch(side: number, patch = 14): number {
  return Math.max(patch, Math.round(side / patch) * patch);
}

function normalizeToCHW(imageData: ImageData, side: number): Float32Array {
  const { data } = imageData;
  const area = side * side;
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

export async function inputToTensor(
  input: ImageBitmap | ImageData,
  side: number
): Promise<ort.Tensor> {
  const s = snapToPatch(side);
  let imageData: ImageData;
  if (input instanceof ImageData) {
    const bmp = await createImageBitmap(input);
    imageData = bitmapToImageData(bmp, s, s);
    bmp.close();
  } else {
    imageData = bitmapToImageData(input, s, s);
  }
  const chw = normalizeToCHW(imageData, s);
  return new ort.Tensor("float32", chw, [1, 3, s, s]);
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
