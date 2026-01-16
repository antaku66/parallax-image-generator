// 画像関連の型定義

/** 処理済み画像データ */
export interface ProcessedImage {
  imageData: ImageData;
  originalWidth: number;
  originalHeight: number;
  processedWidth: number;
  processedHeight: number;
}

/** 処理ステップ */
export type ProcessingStep =
  | "idle"
  | "preprocessing"
  | "segmentation"
  | "depth"
  | "inpainting"
  | "composing"
  | "complete"
  | "error";

/** 品質モード */
export type QualityMode = "high" | "balanced" | "fast";

/** アプリケーション状態 */
export interface AppState {
  // 画像状態
  originalImage: ProcessedImage | null;

  // 処理状態
  processingStep: ProcessingStep;
  processingProgress: number;
  error: Error | null;

  // ビューア設定
  parallaxIntensity: number;
  qualityMode: QualityMode;

  // アクション
  setOriginalImage: (image: ProcessedImage) => void;
  updateProcessingState: (step: ProcessingStep, progress: number) => void;
  setError: (error: Error | null) => void;
  setParallaxIntensity: (value: number) => void;
  setQualityMode: (mode: QualityMode) => void;
  reset: () => void;
}
