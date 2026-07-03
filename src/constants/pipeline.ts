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
  // 2 層分割を行う Otsu 分離度（η）の下限。これ未満は深度が連続的とみなし
  // 連続メッシュ 1 枚へフォールバックする（一様分布 η≈0.75, 明確な二峰 >0.85 が目安）。
  minSplitSeparability: 0.8,
  // 最背面レイヤーの外周ガター（interior 比）。視差移動時のフレーム外露出をインペイント余白で防ぐ。
  bgGutter: 0.04,
  // 前景メッシュは内部に穴を作らないよう不連続カリングを緩める（縁はアルファマットで処理）
  fgDiscontinuityThreshold: 0.9,
  bgTextureSide: 1024,
  fgTextureSide: 1600,
  // 背景インペイント時に前景マスクを膨張させる半径(px)。被写体フリンジの混入を防ぐ。
  inpaintDilate: 6,
  // アルファマットのエッジ整合アップサンプリング（guided filter）。
  // 深度解像度→テクスチャ解像度への双線形拡大で広がった遷移帯を実エッジに吸着させる。
  // 半径 = 拡大率 × matteRadiusFactor。
  matteRadiusFactor: 3.5,
  matteEps: 3e-4,
  // 前景アルファの収縮半径(px, fg テクスチャ解像度)。背景色が混ざった外縁の混合画素を削る。
  fgAlphaErode: 2,
  // 色デコンタミネーションで「純粋な被写体色」とみなすアルファ下限。
  // これ未満のエッジ帯は内部色を押し出して背景色の焼き込みを除去する。
  fgKnownAlpha: 0.9,
} as const;
