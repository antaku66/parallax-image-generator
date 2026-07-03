import { describe, it, expect } from "vitest";
import { buildDepthMesh } from "../buildDepthMesh";
import type { FloatDepthMap } from "../../../types";

function fdm(data: number[], w: number, h: number): FloatDepthMap {
  return { kind: "float32", width: w, height: h, data: Float32Array.from(data) };
}

describe("buildDepthMesh", () => {
  it("(gridX+1)×(gridY+1) 頂点を作り、平坦なら全三角形を残す", () => {
    const mesh = buildDepthMesh({
      depth: fdm([0, 0, 0, 0], 2, 2),
      gridX: 1,
      gridY: 1,
      depthScale: 0.06,
      discontinuityThreshold: 0.18,
    });
    expect(mesh.vertexCount).toBe(4);
    expect(mesh.triangleCount).toBe(2);
    expect(mesh.indices.length).toBe(6);
    expect(mesh.positions.length).toBe(12);
    expect(mesh.uvs.length).toBe(8);
  });

  it("急な深度不連続を含む三角形は破棄される", () => {
    const mesh = buildDepthMesh({
      depth: fdm([0, 0, 0, 1], 2, 2),
      gridX: 1,
      gridY: 1,
      depthScale: 0.06,
      discontinuityThreshold: 0.18,
    });
    expect(mesh.triangleCount).toBeLessThan(2);
  });
});
