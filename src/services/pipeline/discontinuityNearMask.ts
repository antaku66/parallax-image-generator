// 単層シーンの不連続部の手前側マスク（バックドロップ生成用）。
// 単層メッシュは不連続カリングで三角形が落ちるが、その背後には何もなく
// 背景色が露出する。落ちる場所 = 深度ジャンプの near 側を 2 値マスクとして
// 導出し、buildBackLayer の nearer に渡してインペイント済みのバックドロップを敷く。

import type { FloatDepthMap } from "../../types";
import { erodeMin } from "./maskOps";

/**
 * 各画素と近傍最小値の差が threshold を超える画素（= 不連続の near 側）を 1 とする。
 * radius はメッシュ格子 1 セル相当（カリングは格子解像度で起きるため、その幅の帯を覆う）。
 */
export function discontinuityNearMask(
  depth: FloatDepthMap,
  radius: number,
  threshold: number
): Float32Array {
  const { width, height, data } = depth;
  const eroded = erodeMin(data, width, height, radius);
  const out = new Float32Array(width * height);
  for (let i = 0; i < out.length; i++) {
    out[i] = data[i] - eroded[i] > threshold ? 1 : 0;
  }
  return out;
}
