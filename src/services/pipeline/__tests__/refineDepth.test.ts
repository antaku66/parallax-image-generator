import { describe, it, expect } from "vitest";
import { refineDepth } from "../refineDepth";
import type { FloatDepthMap } from "../../../types";

function fdm(data: number[], w: number, h: number): FloatDepthMap {
  return { kind: "float32", width: w, height: h, data: Float32Array.from(data) };
}

describe("refineDepth", () => {
  it("平坦な深度は平坦なまま（値を保つ）", () => {
    const w = 8;
    const h = 8;
    const depth = fdm(new Array(w * h).fill(0.5), w, h);
    const guide = Float32Array.from({ length: w * h }, (_, i) => (i % 3) / 3); // 任意のガイド
    const out = refineDepth(depth, guide, { radius: 2, eps: 1e-3 });
    for (let i = 0; i < out.data.length; i++) {
      expect(out.data[i]).toBeCloseTo(0.5, 4);
    }
  });

  it("寸法を保持し、値は [0,1] に収まる", () => {
    const w = 10;
    const h = 6;
    const depth = fdm(Array.from({ length: w * h }, (_, i) => (i % 5) / 4), w, h);
    const guide = Float32Array.from({ length: w * h }, (_, i) => ((i * 7) % 11) / 10);
    const out = refineDepth(depth, guide, { radius: 2 });
    expect(out.width).toBe(w);
    expect(out.height).toBe(h);
    for (const v of out.data) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it("ガイドと深度のサイズ不一致は例外", () => {
    const depth = fdm([0, 0, 0, 0], 2, 2);
    expect(() => refineDepth(depth, new Float32Array(3))).toThrow();
  });

  it("ガイドに揃った段差を保存する（エッジ整合）", () => {
    // 左半分 0.2 / 右半分 0.8、ガイドも同位置で段差。エッジは平滑化されず残る。
    const w = 8;
    const h = 4;
    const d: number[] = [];
    const g: number[] = [];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        d.push(x < w / 2 ? 0.2 : 0.8);
        g.push(x < w / 2 ? 0.0 : 1.0);
      }
    }
    const out = refineDepth(fdm(d, w, h), Float32Array.from(g), { radius: 1, eps: 1e-4 });
    // 左端と右端は元の値付近を保持
    expect(out.data[0]).toBeCloseTo(0.2, 1);
    expect(out.data[w - 1]).toBeCloseTo(0.8, 1);
  });
});
