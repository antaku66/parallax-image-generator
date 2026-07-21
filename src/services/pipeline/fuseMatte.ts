// 深度マット × seg マスクの融合（実装ガイド PR4）。最前面の累積マスクにのみ適用する。
// strong: seg のシルエットを採用しつつ、深度前面の 2 値マスク + 許容拡張半径の外は 0 へ
//   クランプする。深度から遠く離れた seg 偽陽性と、下層インペイント穴が覆えない領域への
//   拡張（ゴーストの原因）を防ぐ。同一深度帯の非被写体は seg 値へ下がり、下の層が表示する。
// band: 大域は深度マットに従い、遷移帯（境界リング）だけ seg で矯正する。

import { SEGMENTATION_DEFAULTS } from "../../constants/segmentation";
import { dilateMax } from "./maskOps";

export function fuseMatte(
  cum: Float32Array,
  seg: Float32Array,
  width: number,
  height: number,
  mode: "strong" | "band",
  dilateRadius: number
): Float32Array {
  const n = cum.length;
  const out = new Float32Array(n);
  if (mode === "strong") {
    const bin = new Float32Array(n);
    for (let i = 0; i < n; i++) bin[i] = cum[i] > 0.5 ? 1 : 0;
    const bound = dilateMax(bin, width, height, dilateRadius);
    for (let i = 0; i < n; i++) out[i] = Math.min(seg[i], bound[i]);
    return out;
  }
  const band = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    band[i] =
      cum[i] > SEGMENTATION_DEFAULTS.bandLow && cum[i] < SEGMENTATION_DEFAULTS.bandHigh ? 1 : 0;
  }
  const ring = dilateMax(band, width, height, dilateRadius);
  for (let i = 0; i < n; i++) out[i] = cum[i] * (1 - ring[i]) + seg[i] * ring[i];
  return out;
}
