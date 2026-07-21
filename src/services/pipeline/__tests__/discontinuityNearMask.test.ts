import { describe, it, expect } from "vitest";
import { discontinuityNearMask } from "../discontinuityNearMask";
import type { FloatDepthMap } from "../../../types";

function fdm(data: number[], w: number, h: number): FloatDepthMap {
  return { kind: "float32", width: w, height: h, data: Float32Array.from(data) };
}

describe("discontinuityNearMask", () => {
  it("ステップ深度は near 側（値が大きい側）の境界帯だけ 1 になる", () => {
    // 左 4 列 = 0（far）, 右 4 列 = 0.5（near）の 8×3
    const w = 8;
    const h = 3;
    const row = [0, 0, 0, 0, 0.5, 0.5, 0.5, 0.5];
    const mask = discontinuityNearMask(fdm([...row, ...row, ...row], w, h), 1, 0.18);
    for (let y = 0; y < h; y++) {
      expect(mask[y * w + 3]).toBe(0); // far 側の境界画素は 0
      expect(mask[y * w + 4]).toBe(1); // near 側の境界画素は 1
      expect(mask[y * w + 0]).toBe(0); // far 側の内部
      expect(mask[y * w + 7]).toBe(0); // near 側でも境界から radius より遠ければ 0
    }
  });

  it("平坦な深度は全 0", () => {
    const mask = discontinuityNearMask(fdm(new Array(6 * 4).fill(0.4), 6, 4), 2, 0.18);
    for (const v of mask) expect(v).toBe(0);
  });

  it("しきい値未満の緩いランプは全 0", () => {
    // 20 画素で 0→1 のランプ（勾配 ≈0.053/px）。radius 2 なら局所差 ≈0.105 < 0.18。
    const w = 20;
    const data = Array.from({ length: w }, (_, x) => x / (w - 1));
    const mask = discontinuityNearMask(fdm(data, w, 1), 2, 0.18);
    for (const v of mask) expect(v).toBe(0);
  });
});
