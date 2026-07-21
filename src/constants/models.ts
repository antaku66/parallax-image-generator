// モデル配置とメタ（実装ガイド §6, §9）。public/models/manifest.json と同内容（手動同期）。

import type { ModelName } from "../types";

/** ImageNet 正規化パラメータ（Depth Anything V2 の前処理） */
export const IMAGENET_NORMALIZATION = {
  mean: [0.485, 0.456, 0.406],
  std: [0.229, 0.224, 0.225],
} as const;

export const MODELS_BASE_PATH = "/models/";

/** Depth Anything V2 ONNX の入出力テンソル名 */
export const DEPTH_MODEL_IO = {
  inputName: "pixel_values",
  outputName: "predicted_depth",
} as const;

type ModelMeta = {
  file: string;
  version: string;
  /** モデル既定の推論長辺上限（14 の倍数）。load 時の inputSide 指定が優先される */
  inputSide: number;
  sizeBytes: number;
};

export const MODELS: Record<ModelName, ModelMeta> = {
  "depth-anything-v2-base": {
    file: "depth-anything-v2-base.onnx",
    version: "v2-base-q",
    inputSide: 518,
    sizeBytes: 97 * 1024 * 1024,
  },
  // int8 量子化起因の低周波ノイズ（平面の波打ち・帯）が気になる場合の代替
  "depth-anything-v2-base-fp16": {
    file: "depth-anything-v2-base-fp16.onnx",
    version: "v2-base-fp16",
    inputSide: 518,
    sizeBytes: 190 * 1024 * 1024,
  },
  "depth-anything-v2-large": {
    file: "depth-anything-v2-large.onnx",
    version: "v2-large-q",
    inputSide: 518,
    sizeBytes: 320 * 1024 * 1024,
  },
};

// 既定モデル。base は WebGPU/WASM 双方で現実的な処理時間・ダウンロード量に収まる。
// 量子化ノイズが気になるなら "depth-anything-v2-base-fp16"、
// より高精細が必要で GPU が強力なら "depth-anything-v2-large" へ差し替える。
export const DEFAULT_MODEL: ModelName = "depth-anything-v2-base";

export function modelUrl(model: ModelName): string {
  return `${MODELS_BASE_PATH}${MODELS[model].file}`;
}
