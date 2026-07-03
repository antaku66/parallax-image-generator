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

  it("分離度: 明確な二峰は高く、連続的な一様分布は低い", () => {
    const w = 16;
    const h = 16;
    // 二峰: far 0.1 / near 0.9 の半々
    const bimodal: number[] = [];
    for (let i = 0; i < w * h; i++) bimodal.push(i < (w * h) / 2 ? 0.1 : 0.9);
    // 連続: 0..1 の一様な傾斜（風景の奥行きの近似）
    const ramp = Array.from({ length: w * h }, (_, i) => i / (w * h - 1));

    const sBimodal = splitDepthLayers(fdm(bimodal, w, h)).separability;
    const sRamp = splitDepthLayers(fdm(ramp, w, h)).separability;

    expect(sBimodal).toBeGreaterThan(0.95); // 2 値なら η ≈ 1
    expect(sRamp).toBeLessThan(0.8); // 一様分布は η ≈ 0.75
    expect(sBimodal).toBeGreaterThan(sRamp);
  });

  it("分離度は定数深度で 0（全分散ゼロの退化ケース）", () => {
    const d = new Array(16).fill(0.5);
    const { separability } = splitDepthLayers(fdm(d, 4, 4));
    expect(separability).toBe(0);
  });
});
