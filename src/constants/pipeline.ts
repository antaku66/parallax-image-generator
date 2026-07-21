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
  // 深度後処理: スパイク除去（中央値）とエッジ考慮平滑化（guided filter）
  medianRadius: 1,
  // 中央値フィルタの適用回数。半径を上げると髪・枝など 1〜2px の実構造まで潰れるため、
  // 半径 1 の反復で 2px 級のスパイク塊を除去する。
  medianPasses: 2,
  refineRadius: 4,
  refineEps: 1e-3,
  // 前景/背景分離 + 背景インペイントで遮蔽の穴を根本解消する
  splitMargin: 0.06,
  // レイヤー分割を行う Otsu 分離度（η）の下限。これ未満は深度が連続的とみなし
  // 分割しない（一様分布 η≈0.75, 明確な二峰 >0.85 が目安）。再帰分割の全階層で共用。
  minSplitSeparability: 0.8,
  // 各深度スラブの最小画素質量比。退化分割（前景が全画面/皆無）と極小層の乱立を防ぐ。
  minSlabMassRatio: 0.05,
  // しきい値の遷移帯（±splitMargin）内の画素質量比（全画素比）に対する 2 つの判定値。
  // 遷移帯の画素は中間アルファになり、静止時も下層インペイントと混ざって「にじみ帯」として
  // 見えるため、質量が maxBandMassRatio を超える分割はシーム可視性の観点で棄却する
  // （シルエット境界の実測 ≈4.5% は許容、連続的な奥行きを横切る分割 ≈6%+ は棄却）。
  // 質量が emptyBandMassRatio 以下なら谷が実質空とみなし、η が低くても分割を許す
  // （3 モード以上の分布では二分割の η が本質的に下がり、η ゲート単独では分割できない）。
  emptyBandMassRatio: 0.02,
  maxBandMassRatio: 0.05,
  // しきい値同士・深度端との最小間隔（≈ 2×splitMargin + 余白）。
  // smoothstep 遷移帯が重なって帯マスクが濁るのを防ぐ。
  minSlabDepthSpan: 0.15,
  // 最背面レイヤーの外周ガター（interior 比）。視差移動時のフレーム外露出をインペイント余白で防ぐ。
  bgGutter: 0.04,
  // 前景メッシュは内部に穴を作らないよう不連続カリングを緩める（縁はアルファマットで処理）
  fgDiscontinuityThreshold: 0.9,
  bgTextureSide: 1024,
  // 中間レイヤーのテクスチャ長辺。中景は解像度感度が低く、bg と同じに抑えて GPU メモリを節約する。
  midTextureSide: 1024,
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
