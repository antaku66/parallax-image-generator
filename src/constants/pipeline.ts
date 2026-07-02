// パイプラインの初期値（実装ガイド §13/§16/§17）
//
// 推論辺は MODELS[model].inputSide（14 の倍数へスナップ）と
// IMAGE_LIMITS[tier].depthSide が決めるため、ここでは保持しない。

export const PIPELINE_DEFAULTS = {
  // grid は tier 別に IMAGE_LIMITS[tier].meshGrid で上書きされる（ここは既定）
  gridX: 192,
  gridY: 192,
  depthScale: 0.16,
  discontinuityThreshold: 0.18,
  maxCameraOffset: 0.04,
  backdropBlur: 24,
  backdropScale: 1.08,
  // 深度後処理: スパイク除去（中央値）とエッジ考慮平滑化（guided filter）
  medianRadius: 1,
  refineRadius: 4,
  refineEps: 1e-3,
  // 前景/背景分離 + 背景インペイントで遮蔽の穴を根本解消する
  splitMargin: 0.06,
  // 前景メッシュは内部に穴を作らないよう不連続カリングを緩める（縁はアルファマットで処理）
  fgDiscontinuityThreshold: 0.9,
  bgTextureSide: 1024,
  fgTextureSide: 1600,
  // 背景インペイント時に前景マスクを膨張させる半径(px)。被写体フリンジの混入を防ぐ。
  inpaintDilate: 6,
} as const;
