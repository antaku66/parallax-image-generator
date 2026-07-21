import { describe, it, expect } from "vitest";
import { medianDepth } from "../medianDepth";
import type { FloatDepthMap } from "../../../types";

function fdm(data: number[], w: number, h: number): FloatDepthMap {
  return { kind: "float32", width: w, height: h, data: Float32Array.from(data) };
}

describe("medianDepth", () => {
  it("孤立スパイクを除去する（周囲が平坦なら中央値=周囲値）", () => {
    // 中央だけ 1 の 3×3。3×3 中央値なら中央は 0 に落ちる。
    const src = fdm([0, 0, 0, 0, 1, 0, 0, 0, 0], 3, 3);
    const out = medianDepth(src, 1);
    expect(out.data[4]).toBe(0);
  });

  it("寸法を保持する", () => {
    const out = medianDepth(fdm([0, 1, 0, 1, 0, 1], 3, 2), 1);
    expect(out.width).toBe(3);
    expect(out.height).toBe(2);
    expect(out.data.length).toBe(6);
  });

  it("radius<=0 は入力をそのまま返す", () => {
    const src = fdm([0, 1, 0, 1], 2, 2);
    expect(medianDepth(src, 0)).toBe(src);
  });

  it("2×3 のスパイク塊は 1 パスで残るが 2 パスで消える", () => {
    // 8×8 の 0 に rows 2-3 × cols 2-4 の 1 の塊。1 パス目は中芯 2 画素が残る。
    const w = 8;
    const h = 8;
    const data = new Array(w * h).fill(0);
    for (let y = 2; y <= 3; y++) for (let x = 2; x <= 4; x++) data[y * w + x] = 1;
    const pass1 = medianDepth(fdm(data, w, h), 1);
    expect(pass1.data[2 * w + 3]).toBe(1); // 塊の中芯は 1 パスでは残存
    const pass2 = medianDepth(pass1, 1);
    for (const v of pass2.data) expect(v).toBe(0);
  });

  it("なだらかなエッジ（半分 0 / 半分 1）は概ね保存される", () => {
    // 左3列=0, 右3列=1 の 6×3。境界はまたぐが両側の平坦部は保たれる。
    const row = [0, 0, 0, 1, 1, 1];
    const out = medianDepth(fdm([...row, ...row, ...row], 6, 3), 1);
    expect(out.data[0]).toBe(0); // 左端は 0 のまま
    expect(out.data[5]).toBe(1); // 右端は 1 のまま
  });
});
