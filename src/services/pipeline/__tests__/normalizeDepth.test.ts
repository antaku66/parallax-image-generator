import { describe, it, expect } from "vitest";
import { normalizeDepth } from "../normalizeDepth";
import type { FloatDepthMap } from "../../../types";

function fdm(data: number[], w: number, h: number): FloatDepthMap {
  return { kind: "float32", width: w, height: h, data: Float32Array.from(data) };
}

describe("normalizeDepth", () => {
  it("[0,1] に収め、0=far/1=near の向き（大きい生値ほど大きい）を保つ", () => {
    const out = normalizeDepth(fdm([0, 25, 50, 100], 2, 2));
    expect(out.data[0]).toBeCloseTo(0, 5);
    expect(out.data[3]).toBeCloseTo(1, 5);
    for (const v of out.data) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it("定数入力でもゼロ除算せず有限値になる", () => {
    const out = normalizeDepth(fdm([5, 5, 5, 5], 2, 2));
    for (const v of out.data) expect(Number.isFinite(v)).toBe(true);
  });

  it("invert=true で向きが反転する", () => {
    const out = normalizeDepth(fdm([0, 25, 50, 100], 2, 2), { invert: true });
    expect(out.data[0]).toBeCloseTo(1, 5);
    expect(out.data[3]).toBeCloseTo(0, 5);
  });
});
