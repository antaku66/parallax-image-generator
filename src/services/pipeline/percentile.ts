// percentile 計算（normalizeDepth 用）

/**
 * p（0..1）分位点を返す。元配列は変更しない。
 * 大きな配列でも O(n log n) の一回ソートで十分（depth は ~5e5 要素）。
 */
export function percentile(data: ArrayLike<number>, p: number): number {
  const n = data.length;
  if (n === 0) return 0;
  const copy = Float64Array.from(data as ArrayLike<number>);
  copy.sort();
  const idx = Math.min(n - 1, Math.max(0, Math.round(p * (n - 1))));
  return copy[idx];
}
