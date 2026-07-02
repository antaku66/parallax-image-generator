import { describe, it, expect } from "vitest";
import { pushPullInpaint } from "../pushPullInpaint";

describe("pushPullInpaint", () => {
  it("全画素既知ならそのまま返す", () => {
    const w = 4;
    const h = 4;
    const data = Float32Array.from({ length: w * h }, (_, i) => i / 15);
    const known = new Float32Array(w * h).fill(1);
    const out = pushPullInpaint(data, known, w, h, 1);
    for (let i = 0; i < data.length; i++) expect(out[i]).toBeCloseTo(data[i], 5);
  });

  it("定数背景の中央の穴は同じ定数で埋まる", () => {
    const w = 8;
    const h = 8;
    const data = new Float32Array(w * h).fill(0.7);
    const known = new Float32Array(w * h).fill(1);
    // 中央 4x4 を穴に
    for (let y = 2; y < 6; y++) for (let x = 2; x < 6; x++) known[y * w + x] = 0;
    const out = pushPullInpaint(data, known, w, h, 1);
    for (let y = 2; y < 6; y++)
      for (let x = 2; x < 6; x++) expect(out[y * w + x]).toBeCloseTo(0.7, 2);
  });

  it("穴を埋めた結果に NaN/Infinity が無く、既知画素は保持される", () => {
    const w = 16;
    const h = 16;
    const data = Float32Array.from({ length: w * h }, (_, i) => (i % w) / (w - 1)); // 横グラデ
    const known = new Float32Array(w * h).fill(1);
    for (let y = 4; y < 12; y++) for (let x = 4; x < 12; x++) known[y * w + x] = 0;
    const out = pushPullInpaint(data, known, w, h, 1);
    for (let i = 0; i < out.length; i++) expect(Number.isFinite(out[i])).toBe(true);
    // 既知画素（角）は元の値を保持
    expect(out[0]).toBeCloseTo(data[0], 5);
    expect(out[w - 1]).toBeCloseTo(data[w - 1], 5);
    // 穴の値は周辺グラデの範囲内に収まる
    for (let i = 0; i < out.length; i++) {
      expect(out[i]).toBeGreaterThanOrEqual(-0.01);
      expect(out[i]).toBeLessThanOrEqual(1.01);
    }
  });

  it("多チャンネル（RGB）を独立に埋める", () => {
    const w = 8;
    const h = 8;
    const ch = 3;
    const data = new Float32Array(w * h * ch);
    for (let i = 0; i < w * h; i++) {
      data[i * ch] = 0.2;
      data[i * ch + 1] = 0.5;
      data[i * ch + 2] = 0.9;
    }
    const known = new Float32Array(w * h).fill(1);
    for (let y = 3; y < 5; y++) for (let x = 3; x < 5; x++) known[y * w + x] = 0;
    const out = pushPullInpaint(data, known, w, h, ch);
    const i = (3 * w + 3) * ch;
    expect(out[i]).toBeCloseTo(0.2, 2);
    expect(out[i + 1]).toBeCloseTo(0.5, 2);
    expect(out[i + 2]).toBeCloseTo(0.9, 2);
  });
});
