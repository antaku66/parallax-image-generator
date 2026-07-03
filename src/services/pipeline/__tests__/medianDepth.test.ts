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

  it("なだらかなエッジ（半分 0 / 半分 1）は概ね保存される", () => {
    // 左3列=0, 右3列=1 の 6×3。境界はまたぐが両側の平坦部は保たれる。
    const row = [0, 0, 0, 1, 1, 1];
    const out = medianDepth(fdm([...row, ...row, ...row], 6, 3), 1);
    expect(out.data[0]).toBe(0); // 左端は 0 のまま
    expect(out.data[5]).toBe(1); // 右端は 1 のまま
  });
});
