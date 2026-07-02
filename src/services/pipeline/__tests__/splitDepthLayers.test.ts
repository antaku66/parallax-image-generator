import { describe, it, expect } from "vitest";
import { splitDepthLayers } from "../splitDepthLayers";
import type { FloatDepthMap } from "../../../types";

function fdm(data: number[], w: number, h: number): FloatDepthMap {
  return { kind: "float32", width: w, height: h, data: Float32Array.from(data) };
}

describe("splitDepthLayers", () => {
  it("二峰性の深度で near 側を前景（=1）、far 側を背景（=0）にする", () => {
    // 左半分 far(0.1)、右半分 near(0.9)
    const w = 8;
    const h = 4;
    const d: number[] = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) d.push(x < w / 2 ? 0.1 : 0.9);
    const { threshold, foreground } = splitDepthLayers(fdm(d, w, h), 0.06);
    expect(threshold).toBeGreaterThan(0.35);
    expect(threshold).toBeLessThan(0.85);
    expect(foreground[0]).toBeCloseTo(0, 3); // far
    expect(foreground[w - 1]).toBeCloseTo(1, 3); // near
  });

  it("しきい値は [minThreshold, maxThreshold] にクランプされる", () => {
    // ほぼ全画素 near（前景が画面全体）→ Otsu が極端でもクランプされる
    const w = 4;
    const h = 4;
    const d = new Array(w * h).fill(0.95);
    d[0] = 0.0;
    const { threshold } = splitDepthLayers(fdm(d, w, h), 0.06, 0.35, 0.85);
    expect(threshold).toBeGreaterThanOrEqual(0.35);
    expect(threshold).toBeLessThanOrEqual(0.85);
  });

  it("前景アルファは [0,1] に収まる", () => {
    const w = 6;
    const h = 6;
    const d = Array.from({ length: w * h }, (_, i) => (i % 6) / 5);
    const { foreground } = splitDepthLayers(fdm(d, w, h));
    for (const v of foreground) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
});
