// 深度差が大きい三角形を破棄する述語（MD §12）。
// 前景と背景を 1 枚の三角形でつながないため。

export function shouldDropTriangle(
  d0: number,
  d1: number,
  d2: number,
  threshold: number
): boolean {
  return Math.max(d0, d1, d2) - Math.min(d0, d1, d2) > threshold;
}
