import { describe, it, expect } from "vitest";
import { upsampleBilinear, dilateMax } from "../maskOps";

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
