import { describe, it, expect } from "vitest";
import { quantizeDepth, dequantizeDepth } from "../quantize";
import type { FloatDepthMap } from "../../types";

describe("quantize/dequantize (serialize の数値コア)", () => {
  it("uint16 で往復してもほぼ一致する", () => {
    const src: FloatDepthMap = {
      kind: "float32",
      width: 2,
      height: 2,
      data: Float32Array.from([0, 0.25, 0.5, 1]),
    };
    const round = dequantizeDepth(quantizeDepth(src, "uint16"));
    for (let i = 0; i < src.data.length; i++) {
      expect(round.data[i]).toBeCloseTo(src.data[i], 3);
    }
  });

  it("[0,1] の範囲外はクランプされる", () => {
    const src: FloatDepthMap = {
      kind: "float32",
      width: 1,
      height: 2,
      data: Float32Array.from([-1, 2]),
    };
    const q = quantizeDepth(src, "uint8");
    expect(q.data[0]).toBe(0);
    expect(q.data[1]).toBe(255);
  });
});
