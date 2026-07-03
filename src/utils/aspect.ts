// アスペクト戦略（Studio Viewer.dc.html layout() を忠実移植）

import { ASPECT_FILL_TOLERANCE, FIT_PAD } from "../constants/layout";
import type { FitMode } from "../types";

export type FrameBox = {
  width: number;
  height: number;
  /** 額装角丸(px)。Fill は 0。 */
  radius: number;
  /** アンビエント背景を出すか（Fit のみ true） */
  ambient: boolean;
};

/**
 * 画像とステージのアスペクト差が小さければ Fill、大きければ Fit を推奨。
 */
export function decideFitMode(imgAspect: number, stageAspect: number): FitMode {
  const ratio = imgAspect / stageAspect;
  return Math.abs(ratio - 1) <= ASPECT_FILL_TOLERANCE ? "fill" : "fit";
}

/**
 * ステージ内の額装写真の寸法を計算する（layout() 準拠）。
 */
export function computeFrameBox(
  stageW: number,
  stageH: number,
  imgAspect: number,
  mode: FitMode
): FrameBox {
  const stageAspect = stageW / stageH;
  let width: number;
  let height: number;

  if (mode === "fill") {
    // cover: ステージを覆い、はみ出しは視差の余白になる
    if (imgAspect > stageAspect) {
      height = stageH;
      width = stageH * imgAspect;
    } else {
      width = stageW;
      height = stageW / imgAspect;
    }
    return { width, height, radius: 0, ambient: false };
  }

  // contain: 全体を額装し、余白はアンビエント背景で満たす
  if (imgAspect > stageAspect) {
    width = stageW * FIT_PAD;
    height = width / imgAspect;
  } else {
    height = stageH * FIT_PAD;
    width = height * imgAspect;
  }
  return { width, height, radius: 16, ambient: true };
}
