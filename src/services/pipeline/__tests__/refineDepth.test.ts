import { describe, it, expect } from "vitest";
import { boxFilter, refineDepth } from "../refineDepth";
import type { FloatDepthMap } from "../../../types";

// クランプ境界の素朴実装（移動和実装の検証基準）
function boxFilterNaive(src: Float32Array, w: number, h: number, r: number): Float32Array {
  const win = r * 2 + 1;
  const tmp = new Float32Array(src.length);
  const dst = new Float32Array(src.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0;
      for (let k = -r; k <= r; k++) sum += src[y * w + Math.min(w - 1, Math.max(0, x + k))];
      tmp[y * w + x] = sum / win;
    }
  }
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      let sum = 0;
      for (let k = -r; k <= r; k++) sum += tmp[Math.min(h - 1, Math.max(0, y + k)) * w + x];
      dst[y * w + x] = sum / win;
    }
  }
  return dst;
}

describe("boxFilter", () => {
  it("移動和実装が素朴実装と一致する（半径が寸法を超えるケース含む）", () => {
    const w = 7;
    const h = 5;
    const src = Float32Array.from({ length: w * h }, (_, i) => ((i * 31) % 17) / 16);
    for (const r of [1, 2, 4, 8]) {
      const fast = boxFilter(src, w, h, r);
      const naive = boxFilterNaive(src, w, h, r);
      for (let i = 0; i < src.length; i++) {
        expect(fast[i]).toBeCloseTo(naive[i], 5);
      }
    }
  });
});

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
