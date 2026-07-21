import { describe, it, expect } from "vitest";
import { upsampleBilinear, dilateMax, erodeMin, downsampleMax } from "../maskOps";

describe("upsampleBilinear", () => {
  it("拡大しても端点値を保持し、寸法が変わる", () => {
    const src = Float32Array.from([0, 1]); // 1x2
    const out = upsampleBilinear(src, 2, 1, 5, 1);
    expect(out.length).toBe(5);
    expect(out[0]).toBeCloseTo(0, 5);
    expect(out[4]).toBeCloseTo(1, 5);
    expect(out[2]).toBeCloseTo(0.5, 5); // 中央は補間
  });

  it("定数マップは定数のまま", () => {
    const src = new Float32Array(9).fill(0.4);
    const out = upsampleBilinear(src, 3, 3, 6, 6);
    for (const v of out) expect(v).toBeCloseTo(0.4, 5);
  });
});

describe("dilateMax", () => {
  it("孤立点を半径分だけ広げる", () => {
    const w = 5;
    const h = 5;
    const m = new Float32Array(w * h);
    m[2 * w + 2] = 1; // 中央
    const out = dilateMax(m, w, h, 1);
    // 中央 3x3 が 1 になる
    for (let y = 1; y <= 3; y++) for (let x = 1; x <= 3; x++) expect(out[y * w + x]).toBe(1);
    expect(out[0]).toBe(0); // 角は届かない
  });

  it("r<=0 はそのまま返す", () => {
    const m = Float32Array.from([0, 1, 0, 1]);
    expect(dilateMax(m, 2, 2, 0)).toBe(m);
  });
});

describe("downsampleMax", () => {
  it("被覆保証: src の 1 画素はどれも縮小先の対応画素を 1 にする", () => {
    const sw = 16;
    const sh = 12;
    const dw = 5;
    const dh = 4;
    // 擬似ランダムな 2 値マスク
    const src = Float32Array.from({ length: sw * sh }, (_, i) => ((i * 7) % 11 < 3 ? 1 : 0));
    const out = downsampleMax(src, sw, sh, dw, dh);
    for (let y = 0; y < sh; y++) {
      for (let x = 0; x < sw; x++) {
        if (src[y * sw + x] > 0.5) {
          const dx = Math.min(dw - 1, Math.floor((x * dw) / sw));
          const dy = Math.min(dh - 1, Math.floor((y * dh) / sh));
          expect(out[dy * dw + dx]).toBe(1);
        }
      }
    }
  });

  it("全 0 のマスクは全 0 のまま", () => {
    const out = downsampleMax(new Float32Array(8 * 8), 8, 8, 3, 3);
    for (const v of out) expect(v).toBe(0);
  });

  it("2 値出力（0 か 1 のみ）", () => {
    const src = Float32Array.from({ length: 6 * 6 }, (_, i) => (i % 2 ? 0.7 : 0.3));
    const out = downsampleMax(src, 6, 6, 2, 2);
    for (const v of out) expect(v === 0 || v === 1).toBe(true);
  });
});

describe("erodeMin", () => {
  it("孤立した穴（0）を半径分だけ広げる（マスクを収縮させる）", () => {
    const w = 5;
    const h = 5;
    const m = new Float32Array(w * h).fill(1);
    m[2 * w + 2] = 0; // 中央に穴
    const out = erodeMin(m, w, h, 1);
    // 中央 3x3 が 0 になる
    for (let y = 1; y <= 3; y++) for (let x = 1; x <= 3; x++) expect(out[y * w + x]).toBe(0);
    expect(out[0]).toBe(1); // 角は届かない
  });

  it("dilateMax の双対（1-erode(m) == dilate(1-m)）", () => {
    const w = 6;
    const h = 4;
    const m = Float32Array.from({ length: w * h }, (_, i) => ((i * 13) % 7) / 6);
    const inv = Float32Array.from(m, (v) => 1 - v);
    const eroded = erodeMin(m, w, h, 2);
    const dilatedInv = dilateMax(inv, w, h, 2);
    for (let i = 0; i < m.length; i++) {
      expect(1 - eroded[i]).toBeCloseTo(dilatedInv[i], 5);
    }
  });

  it("r<=0 はそのまま返す", () => {
    const m = Float32Array.from([0, 1, 0, 1]);
    expect(erodeMin(m, 2, 2, 0)).toBe(m);
  });
});
