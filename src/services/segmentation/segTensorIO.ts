// テンソル入出力（MODNet 等の前景マッティング）。
// 入力: [1,3,H,W] float32 NCHW RGB（(x-mean)/std 正規化）
// 出力: [1,1,H,W]（前景アルファ）
// モデルは動的軸対応のため、アスペクト比を保ったまま両辺 32 の倍数で推論する。

import * as ort from "onnxruntime-web/webgpu";
import type { ForegroundMask } from "../../types";
import { bitmapToImageData } from "../image/canvas";

/** ダウンサンプル段数に合わせた stride(32) の倍数へスナップ */
export function snapToStride(side: number, stride = 32): number {
  return Math.max(stride, Math.round(side / stride) * stride);
}

/**
 * アスペクト比を保ち、長辺を maxSide 以下（拡大なし）・両辺を stride の倍数にした
 * 推論寸法 [width, height] を求める。
 */
export function segInferenceDims(
  width: number,
  height: number,
  maxSide: number
): [number, number] {
  const scale = Math.min(1, maxSide / Math.max(width, height));
  return [snapToStride(width * scale), snapToStride(height * scale)];
}

/** 入力画像をアスペクト比保持でテンソル化する。maxSide は推論長辺の上限。 */
export function segInputToTensor(
  input: ImageBitmap,
  maxSide: number,
  normalization: { mean: number; std: number }
): ort.Tensor {
  const [w, h] = segInferenceDims(input.width, input.height, maxSide);
  const { data } = bitmapToImageData(input, w, h);
  const area = w * h;
  const chw = new Float32Array(3 * area);
  const { mean, std } = normalization;
  for (let p = 0; p < area; p++) {
    chw[p] = (data[p * 4] / 255 - mean) / std;
    chw[area + p] = (data[p * 4 + 1] / 255 - mean) / std;
    chw[2 * area + p] = (data[p * 4 + 2] / 255 - mean) / std;
  }
  return new ort.Tensor("float32", chw, [1, 3, h, w]);
}

/** 出力テンソル → 前景マスク（[0,1] へクランプ） */
export function segOutputToMask(output: ort.Tensor): ForegroundMask {
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
    throw new Error(`想定外のマスク出力形状: [${dims.join(",")}]`);
  }
  const raw = output.data as Float32Array;
  const data = new Float32Array(width * height);
  for (let i = 0; i < data.length; i++) {
    data[i] = Math.min(1, Math.max(0, raw[i]));
  }
  return { width, height, data };
}
