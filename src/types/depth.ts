// 深度マップと深度推定器の型（実装ガイド §9, §10）
//
// 深度規約: 0.0 = far（遠い） / 1.0 = near（近い）。
// この向きはアプリ全体で不変。反転が必要な場合は normalizeDepth の 1 箇所でのみ行う。

/** 正規化済み Float 深度（値域 [0,1], 0=far/1=near） */
export type FloatDepthMap = {
  kind: "float32";
  width: number;
  height: number;
  data: Float32Array;
};

/** 保存/転送向けに量子化した深度（0=far .. max=near） */
export type QuantizedDepthMap = {
  kind: "uint8" | "uint16";
  width: number;
  height: number;
  data: Uint8Array | Uint16Array;
};

export type DepthMap = FloatDepthMap | QuantizedDepthMap;

/** ONNX 実行バックエンド */
export type OnnxBackend = "webgpu" | "wasm";

/** 対応モデル名 */
export type ModelName =
  | "depth-anything-v2-base"
  | "depth-anything-v2-base-fp16"
  | "depth-anything-v2-large";

export type DepthEstimatorLoadOptions = {
  model: ModelName;
  backend: "auto" | OnnxBackend;
  /** 推論長辺の上限。tier 別の depthSide を渡す（省略時はモデル既定値） */
  inputSide?: number;
  /** モデルダウンロードの進捗コールバック */
  onDownloadProgress?: (loaded: number, total: number) => void;
};

/** 深度推定器のインターフェース（実装ガイド §9）。実装は ONNX 経由で差し替え可能。 */
export interface DepthEstimator {
  load(options: DepthEstimatorLoadOptions): Promise<void>;
  /** 生の深度（未正規化）。正規化は normalizeDepth が担う。 */
  predict(input: ImageBitmap | ImageData): Promise<FloatDepthMap>;
  readonly backend: OnnxBackend | null;
  dispose(): void;
}
