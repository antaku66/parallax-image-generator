// Studio レイアウト定数（Studio Viewer.dc.html layout() / README）

/** Fit 時の額装余白（写真をステージの 86% に収める） */
export const FIT_PAD = 0.86;

/** アンビエント背景（同一画像をぼかして拡大, README / MD §13） */
export const AMBIENT = {
  scale: 1.5,
  blur: 46,
  saturate: 1.15,
  brightness: 0.97,
} as const;

/** 画像とステージのアスペクト比がこの許容内なら Fill、超えると Fit を自動選択 */
export const ASPECT_FILL_TOLERANCE = 0.18;

/** モバイル判定のブレークポイント(px) */
export const MOBILE_BREAKPOINT = 720;

/** devicePixelRatio の上限（描画コスト抑制のための実装上の調整値。真実側に規定は無い） */
export const MAX_DPR_DESKTOP = 2;
export const MAX_DPR_MOBILE = 1.5;
