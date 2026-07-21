// segmentation 採用可否の信頼度ゲート（実装ガイド PR4）。
// 深度のみマットに対して seg を「いつ・どの程度」信じるかを画像ごとに自動判定する。
// 不採用（none）でも処理全体は失敗にしない（部分失敗の隔離）。

import type { SegFuseMode } from "../../types";
import { SEGMENTATION_DEFAULTS } from "../../constants/segmentation";
import { percentile } from "./percentile";

export type SegGateResult = {
  mode: SegFuseMode;
  /** 判定理由（診断値込み）。PerfBadge のツールチップと導入効果の計測に使う */
  reason: string;
};

/**
 * seg マスク（深度と同寸 [0,1]）・正規化済み深度・深度前面の累積マスクから融合モードを決める。
 * 全ゲート通過かつ IoU が高ければ strong（seg のシルエットを採用）、
 * 中程度なら band（境界帯のみ矯正）、いずれかのゲート不通過なら none（深度のみマット）。
 */
export function evaluateSegGate(
  seg: Float32Array,
  depth: Float32Array,
  cumFront: Float32Array
): SegGateResult {
  const d = SEGMENTATION_DEFAULTS;
  const n = seg.length;

  let fg = 0;
  let soft = 0;
  for (let i = 0; i < n; i++) {
    if (seg[i] > 0.5) fg++;
    if (seg[i] > 0.15 && seg[i] < 0.85) soft++;
  }
  const area = fg / n;
  if (area < d.minAreaRatio || area > d.maxAreaRatio) {
    return { mode: "none", reason: `面積比 ${area.toFixed(2)} が範囲外` };
  }
  const softRatio = soft / fg;
  if (softRatio > d.maxSoftRatio) {
    return { mode: "none", reason: `ソフト率 ${softRatio.toFixed(2)} が高く低信頼` };
  }

  // 深度整合: seg の内側が実際に手前（深度が大きい）にあるか。
  // 確信度の高い画素（>0.7 / <0.3）だけで中央値を比較する。
  const inside: number[] = [];
  const outside: number[] = [];
  for (let i = 0; i < n; i++) {
    if (seg[i] > 0.7) inside.push(depth[i]);
    else if (seg[i] < 0.3) outside.push(depth[i]);
  }
  const sep = percentile(inside, 0.5) - percentile(outside, 0.5);
  if (!(sep >= d.minDepthSeparation)) {
    return { mode: "none", reason: `深度整合 ${sep.toFixed(2)} が不足` };
  }

  // 深度前面マスクとの IoU: 「前面」の解釈が seg と深度で一致しているか
  let inter = 0;
  let union = 0;
  for (let i = 0; i < n; i++) {
    const a = seg[i] > 0.5;
    const b = cumFront[i] > 0.5;
    if (a && b) inter++;
    if (a || b) union++;
  }
  const iou = union > 0 ? inter / union : 0;
  if (iou >= d.strongIou) return { mode: "strong", reason: `IoU ${iou.toFixed(2)}` };
  if (iou >= d.bandIou) return { mode: "band", reason: `IoU ${iou.toFixed(2)}` };
  return { mode: "none", reason: `IoU ${iou.toFixed(2)} が不足` };
}
