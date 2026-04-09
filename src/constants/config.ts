// アプリケーション設定定数

import type { QualityMode } from "../types";
import type { AutoMaskConfig } from "../types/segmentation";

export const APP_CONFIG = {
  // 画像処理の最大サイズ
  MAX_IMAGE_SIZE: 1024,
  // 対応画像形式
  SUPPORTED_IMAGE_TYPES: ["image/jpeg", "image/png", "image/webp"],
  // 最大ファイルサイズ（20MB）
  MAX_FILE_SIZE: 20 * 1024 * 1024,
} as const;

/** SAM2 モデル設定 */
export const SAM2_CONFIG = {
  // モデルの入力サイズ（固定）
  INPUT_SIZE: 1024,
  // Encoder モデル情報
  ENCODER: {
    MODEL_URL:
      "https://huggingface.co/g-ronimo/sam2-tiny/resolve/main/sam2_hiera_tiny_encoder.onnx",
    MODEL_NAME: "sam2_hiera_tiny_encoder.onnx",
    EXPECTED_SIZE_MB: 148,
  },
  // Decoder モデル情報
  DECODER: {
    MODEL_URL:
      "https://huggingface.co/g-ronimo/sam2-tiny/resolve/main/sam2_hiera_tiny_decoder.onnx",
    MODEL_NAME: "sam2_hiera_tiny_decoder.onnx",
    EXPECTED_SIZE_MB: 20,
  },
  // 画像正規化パラメータ（ImageNet 標準）
  NORMALIZATION: {
    MEAN: [0.485, 0.456, 0.406],
    STD: [0.229, 0.224, 0.225],
  },
} as const;

/** 品質モード別 AutoMask 設定 */
export const AUTO_MASK_CONFIGS: Record<QualityMode, AutoMaskConfig> = {
  high: {
    pointsPerSide: 32,
    pointsPerBatch: 64,
    predIouThresh: 0.88,
    stabilityScoreThresh: 0.95,
    boxNmsThresh: 0.7,
    minMaskRegionArea: 100,
  },
  balanced: {
    pointsPerSide: 24,
    pointsPerBatch: 32,
    predIouThresh: 0.86,
    stabilityScoreThresh: 0.92,
    boxNmsThresh: 0.7,
    minMaskRegionArea: 150,
  },
  fast: {
    pointsPerSide: 16,
    pointsPerBatch: 16,
    predIouThresh: 0.84,
    stabilityScoreThresh: 0.9,
    boxNmsThresh: 0.7,
    minMaskRegionArea: 200,
  },
} as const;

/** ONNX Runtime 設定 */
export const ONNX_CONFIG = {
  // WASM ファイルのパス（Vite ビルド後のルート相対パス）
  WASM_PATHS: "/",
  // スレッド数（0=自動検出）
  NUM_THREADS: 0,
  // セッションオプション
  SESSION_OPTIONS: {
    graphOptimizationLevel: "all" as const,
    executionMode: "parallel" as const,
  },
} as const;
