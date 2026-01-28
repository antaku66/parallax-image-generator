// セグメンテーション関連の型定義

/** バウンディングボックス */
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** 個別セグメント */
export interface Segment {
  id: number;
  mask: Uint8Array;
  bbox: BoundingBox;
  area: number;
  iouScore: number;
  stabilityScore: number;
  isBackground: boolean;
}

/** セグメンテーション結果 */
export interface SegmentationResult {
  segments: Segment[];
  backgroundMask: Uint8Array;
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
  processingTime: number;
}

/** 自動マスク生成設定 */
export interface AutoMaskConfig {
  pointsPerSide: number;
  pointsPerBatch: number;
  predIouThresh: number;
  stabilityScoreThresh: number;
  boxNmsThresh: number;
  minMaskRegionArea: number;
}

/** ONNX 実行プロバイダー */
export type OnnxExecutionProvider = "webgpu" | "wasm";

/** ONNX Runtime 初期化状態 */
export interface OnnxRuntimeState {
  initialized: boolean;
  executionProvider: OnnxExecutionProvider;
  webgpuSupported: boolean;
  error: Error | null;
}
