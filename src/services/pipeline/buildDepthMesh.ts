// 2.5D メッシュ生成（MD §12）
//
// 正規化モデル空間（[-0.5,0.5] × [-0.5,0.5]）に格子頂点を並べ、
// z = 正規化深度 × depthScale を与える。uv は左上原点（renderer は flipY=false）。
// depth 差の大きい三角形は shouldDropTriangle で破棄する。

import type { FloatDepthMap, SceneMesh } from "../../types";
import { shouldDropTriangle } from "./shouldDropTriangle";

export type BuildDepthMeshOptions = {
  depth: FloatDepthMap;
  gridX: number;
  gridY: number;
  depthScale: number;
  discontinuityThreshold: number;
  /** 前景アルファ（[0,1], depth と同座標）。指定時、前景に掛からない三角形を破棄する */
  mask?: FloatDepthMap;
  /** 三角形の頂点のいずれかがこの前景アルファ以上なら保持（既定 0.5） */
  maskKeepThreshold?: number;
};

function sampleDepth(depth: FloatDepthMap, u: number, v: number): number {
  const { width, height, data } = depth;
  const fx = u * (width - 1);
  const fy = v * (height - 1);
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const x1 = Math.min(width - 1, x0 + 1);
  const y1 = Math.min(height - 1, y0 + 1);
  const tx = fx - x0;
  const ty = fy - y0;
  const d00 = data[y0 * width + x0];
  const d10 = data[y0 * width + x1];
  const d01 = data[y1 * width + x0];
  const d11 = data[y1 * width + x1];
  const top = d00 + (d10 - d00) * tx;
  const bot = d01 + (d11 - d01) * tx;
  return top + (bot - top) * ty;
}

export function buildDepthMesh(options: BuildDepthMeshOptions): SceneMesh {
  const { depth, gridX, gridY, depthScale, discontinuityThreshold, mask, maskKeepThreshold = 0.5 } =
    options;
  const cols = gridX + 1;
  const rows = gridY + 1;
  const vertexCount = cols * rows;

  const positions = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);
  const vDepth = new Float32Array(vertexCount);
  const vMask = mask ? new Float32Array(vertexCount) : null;

  for (let j = 0; j < rows; j++) {
    const v = rows > 1 ? j / (rows - 1) : 0;
    for (let i = 0; i < cols; i++) {
      const u = cols > 1 ? i / (cols - 1) : 0;
      const d = sampleDepth(depth, u, v);
      const idx = j * cols + i;
      positions[idx * 3 + 0] = u - 0.5;
      positions[idx * 3 + 1] = 0.5 - v;
      positions[idx * 3 + 2] = d * depthScale;
      uvs[idx * 2 + 0] = u;
      uvs[idx * 2 + 1] = v;
      vDepth[idx] = d;
      if (vMask) vMask[idx] = sampleDepth(mask!, u, v);
    }
  }

  // 前景マスク指定時: 3 頂点のいずれも前景でない三角形は破棄（前景レイヤーの切り抜き）
  const inForeground = (x: number, y: number, z: number): boolean =>
    !vMask || Math.max(vMask[x], vMask[y], vMask[z]) >= maskKeepThreshold;

  const indexList: number[] = [];
  for (let j = 0; j < gridY; j++) {
    for (let i = 0; i < gridX; i++) {
      const a = j * cols + i;
      const b = a + 1;
      const c = a + cols;
      const d = c + 1;
      if (
        !shouldDropTriangle(vDepth[a], vDepth[c], vDepth[b], discontinuityThreshold) &&
        inForeground(a, c, b)
      ) {
        indexList.push(a, c, b);
      }
      if (
        !shouldDropTriangle(vDepth[b], vDepth[c], vDepth[d], discontinuityThreshold) &&
        inForeground(b, c, d)
      ) {
        indexList.push(b, c, d);
      }
    }
  }

  const indices = new Uint32Array(indexList);
  return {
    positions,
    uvs,
    indices,
    gridX,
    gridY,
    vertexCount,
    triangleCount: indices.length / 3,
  };
}
