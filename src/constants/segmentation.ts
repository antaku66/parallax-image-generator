// segmentation 統合の初期値（実装ガイド PR4）。
// seg は「被写体」概念、深度は「距離」概念で層構造の解釈が異なるため、
// 常に深度マットとの整合をゲートで確認してから限定的に融合する。

export const SEGMENTATION_DEFAULTS = {
  // 面積比ゲート: 被写体なし / 画面ほぼ全体が被写体（風景・過度の接写）を弾く
  minAreaRatio: 0.04,
  maxAreaRatio: 0.7,
  // ソフト率ゲート: 前景質量に対する中間値（迷い）画素の比。高いほど低信頼マスク
  maxSoftRatio: 0.35,
  // 深度整合ゲート: seg 内外の深度中央値の差の下限。被写体が実際に手前でなければ
  // 不採用（柵・ガラス越しの被写体を前面レイヤーへ置くと深度順序が破綻するため）
  minDepthSeparation: 0.12,
  // 深度前面マスクとの IoU。strong=置換融合 / band=境界帯のみ融合 / 未満=不採用
  strongIou: 0.7,
  bandIou: 0.45,
  // band 融合で「境界帯」とみなす累積マスクの値域
  bandLow: 0.05,
  bandHigh: 0.95,
} as const;
