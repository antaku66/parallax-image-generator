// 前景セグメンテーション（マッティング）の型（実装ガイド PR4）。
// seg は独立した処理として扱い、モデル未配置・推論失敗・ゲート不採用の
// いずれでも深度のみのパイプラインへ無劣化で戻る（部分失敗の隔離）。

import type { OnnxBackend } from "./depth";

/** 対応セグメンテーションモデル名 */
export type SegModelName = "modnet";

/** 前景マスク（値域 [0,1], 1=前景）。寸法は seg 推論解像度のまま */
export type ForegroundMask = {
  width: number;
  height: number;
  data: Float32Array;
};

export type ForegroundSegmenterLoadOptions = {
  model: SegModelName;
  /** モデルダウンロードの進捗コールバック */
  onDownloadProgress?: (loaded: number, total: number) => void;
};

/** 前景セグメンタのインターフェース（DepthEstimator と同型） */
export interface ForegroundSegmenter {
  load(options: ForegroundSegmenterLoadOptions): Promise<void>;
  predict(input: ImageBitmap): Promise<ForegroundMask>;
  readonly backend: OnnxBackend | null;
  dispose(): void;
}

/** seg マスクの融合モード（segmentationGate が判定） */
export type SegFuseMode = "strong" | "band" | "none";
