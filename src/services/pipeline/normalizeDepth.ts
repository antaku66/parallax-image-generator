// 深度の percentile 正規化（MD §10）
//
// 規約: 出力は 0.0=far / 1.0=near。
// Depth Anything V2 は「大きい=近い」を出力するため、既定では反転不要（invert=false）。
// 反転が必要なモデルに備え invert フラグをここ 1 箇所で扱う（二重反転防止）。

import type { FloatDepthMap } from "../../types";
import { clamp } from "../../utils/clamp";
import { percentile } from "./percentile";

export type NormalizeDepthOptions = {
  invert?: boolean;
  lowPercentile?: number;
  highPercentile?: number;
};

export function normalizeDepth(
  depth: FloatDepthMap,
  options: NormalizeDepthOptions = {}
): FloatDepthMap {
  const { invert = false, lowPercentile = 0.02, highPercentile = 0.98 } = options;
  const src = depth.data;
  const n = src.length;

  // invert 時のみ符号反転した作業配列を用意（それ以外はコピーを避ける）
  const work = invert ? Float32Array.from(src, (v) => -v) : src;

  const p02 = percentile(work, lowPercentile);
  const p98 = percentile(work, highPercentile);
  // ゼロ除算を避けるため range に下限を設ける
  const range = Math.max(p98 - p02, 1e-6);

  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = clamp((work[i] - p02) / range, 0, 1);
  }

  return { kind: "float32", width: depth.width, height: depth.height, data: out };
}
