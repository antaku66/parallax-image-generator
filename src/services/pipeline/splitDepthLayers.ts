// 深度を前景/背景へ分割する閾値（Otsu）と前景ソフトマスクを求める。
// 入力は refined 深度（0=far / 1=near）。前景 = near 側。

import type { FloatDepthMap } from "../../types";
import { clamp } from "../../utils/clamp";

export type DepthSplit = {
  /** 前景/背景を分ける深度しきい値（[0,1]） */
  threshold: number;
  /** 前景アルファ（[0,1], near=1）。深度と同寸・同順 */
  foreground: Float32Array;
};

// Otsu 法: クラス間分散を最大化するしきい値を求める
function otsuThreshold(depth: Float32Array, bins = 256): number {
  const hist = new Float32Array(bins);
  for (let i = 0; i < depth.length; i++) {
    const b = Math.min(bins - 1, Math.max(0, Math.round(depth[i] * (bins - 1))));
    hist[b]++;
  }
  const total = depth.length;
  let sumAll = 0;
  for (let i = 0; i < bins; i++) sumAll += i * hist[i];

  let sumB = 0;
  let wB = 0;
  let maxVar = -1;
  // 最大分散が谷（ヒストグラムの空き帯）で一定値のプラトーになるため、
  // その中点を採ることで二峰の谷の中央にしきい値を置く。
  let lo = (bins - 1) / 2;
  let hi = (bins - 1) / 2;
  for (let i = 0; i < bins; i++) {
    wB += hist[i];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += i * hist[i];
    const mB = sumB / wB;
    const mF = (sumAll - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > maxVar + 1e-9) {
      maxVar = between;
      lo = i;
      hi = i;
    } else if (between >= maxVar - 1e-9) {
      hi = i;
    }
  }
  return (lo + hi) / 2 / (bins - 1);
}

export function splitDepthLayers(
  depth: FloatDepthMap,
  margin = 0.06,
  minThreshold = 0.35,
  maxThreshold = 0.85
): DepthSplit {
  // 退化した分割（前景が画面全体/皆無）を避けるため範囲をクランプ
  const threshold = clamp(otsuThreshold(depth.data), minThreshold, maxThreshold);

  const foreground = new Float32Array(depth.data.length);
  const lo = threshold - margin;
  const hi = threshold + margin;
  const span = Math.max(1e-6, hi - lo);
  for (let i = 0; i < foreground.length; i++) {
    // smoothstep(lo, hi, depth): near(>hi)=1, far(<lo)=0 の柔らかい前景アルファ
    const t = clamp((depth.data[i] - lo) / span, 0, 1);
    foreground[i] = t * t * (3 - 2 * t);
  }
  return { threshold, foreground };
}
