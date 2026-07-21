import { describe, it, expect } from "vitest";
import { fuseMatte } from "../fuseMatte";
import { dilateMax } from "../maskOps";

const W = 8;
const H = 8;

/** 中央 4×4 の 2 値マスク */
function centerMask(): Float32Array {
  const m = new Float32Array(W * H);
  for (let y = 2; y < 6; y++) for (let x = 2; x < 6; x++) m[y * W + x] = 1;
  return m;
}

describe("fuseMatte (strong)", () => {
  it("許容拡張半径の外では seg 偽陽性が 0 にクランプされる", () => {
    const cum = centerMask();
    const seg = new Float32Array(W * H).fill(1); // 全画素を前景と主張する偽陽性
    const out = fuseMatte(cum, seg, W, H, "strong", 1);
    expect(out[0]).toBe(0); // 角は cum の膨張が届かない
    expect(out[3 * W + 3]).toBe(1); // 被写体内部は seg 値
    expect(out[1 * W + 1]).toBe(1); // 半径 1 の膨張リング内は seg を許容
  });

  it("同一深度帯の非被写体（seg が 0）は前面から外れる", () => {
    const cum = centerMask();
    const seg = new Float32Array(W * H); // seg は被写体なしと主張
    const out = fuseMatte(cum, seg, W, H, "strong", 1);
    for (const v of out) expect(v).toBe(0);
  });

  it("出力は dilate(bin(cum)) を超えない（被覆上限）", () => {
    const cum = centerMask();
    const seg = Float32Array.from({ length: W * H }, (_, i) => ((i * 7) % 10) / 9);
    const r = 2;
    const out = fuseMatte(cum, seg, W, H, "strong", r);
    const bound = dilateMax(centerMask(), W, H, r);
    for (let i = 0; i < out.length; i++) {
      expect(out[i]).toBeLessThanOrEqual(bound[i]);
    }
  });
});

describe("fuseMatte (band)", () => {
  it("遷移帯の外は cum のまま、遷移帯だけ seg に置き換わる", () => {
    // cum: 左 3 列 = 1、右へ 0.5, 0 と減衰する遷移帯付きマスク
    const cum = new Float32Array(W * H);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        cum[y * W + x] = x < 3 ? 1 : x === 3 ? 0.5 : 0;
      }
    }
    const seg = new Float32Array(W * H).fill(1);
    const out = fuseMatte(cum, seg, W, H, "band", 1);
    for (let y = 0; y < H; y++) {
      expect(out[y * W + 0]).toBe(1); // 内部（帯外）は不変
      expect(out[y * W + 7]).toBe(0); // 外部（帯外）は不変
      expect(out[y * W + 3]).toBe(1); // 遷移帯（0.5）は seg 値へ
    }
  });

  it("cum が完全 2 値（遷移帯なし）なら恒等", () => {
    const cum = centerMask();
    const seg = new Float32Array(W * H).fill(0.7);
    const out = fuseMatte(cum, seg, W, H, "band", 1);
    for (let i = 0; i < out.length; i++) expect(out[i]).toBe(cum[i]);
  });
});
