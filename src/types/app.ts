// UI・処理フローの基本列挙とスカラ型（依存を持たないリーフ）

/** アプリの表示フェーズ（design_handoff_spatial_scene/README.md「State Management」） */
export type AppPhase = "empty" | "loading" | "viewer" | "error";

/** アスペクト戦略（Studio layout()） */
export type FitMode = "fit" | "fill";

/** Worker の処理ステージ（実装ガイド §20）。並びは emit 順。 */
export type ProcessingStage =
  | "preprocessing-image"
  | "loading-model"
  | "estimating-depth"
  | "normalizing-depth"
  | "building-mesh"
  | "finalizing";

/** 進捗状態 */
export type ProgressState = {
  stage: ProcessingStage;
  /** 0..1 */
  percent: number;
};

/** ビューアの調整パラメータ（実装ガイド §22） */
export type ParamsState = {
  /** 立体感（Depth スライダー, 0..1） */
  depthScale: number;
  /** 視差の強さ（カメラ最大オフセットへマップ, 0..1） */
  parallaxStrength: number;
  /** 三角形カリングの不連続しきい値（再メッシュ用） */
  edgeCutThreshold: number;
};

/** カメラのオフセット（clamp 済み, 実装ガイド §19） */
export type CameraState = {
  offsetX: number;
  offsetY: number;
};
