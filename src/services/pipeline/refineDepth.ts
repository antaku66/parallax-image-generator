// エッジ考慮の深度精緻化（MD §11）。
// guided filter（He et al.）で RGB 輝度をガイドに、深度エッジを画像エッジへ整合させつつ平滑化する。
// 前景/背景の境界が実シルエットに一致し、平坦部（葉むら等）のノイズは均される。

import type { FloatDepthMap } from "../../types";
import { clamp } from "../../utils/clamp";

// 分離型ボックスフィルタ（半径 r の平均）。境界はクランプ。
function boxFilter(src: Float32Array, width: number, height: number, r: number): Float32Array {
  const win = r * 2 + 1;
  const tmp = new Float32Array(src.length);
  const dst = new Float32Array(src.length);
  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      let sum = 0;
      for (let k = -r; k <= r; k++) sum += src[row + Math.min(width - 1, Math.max(0, x + k))];
      tmp[row + x] = sum / win;
    }
  }
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      let sum = 0;
      for (let k = -r; k <= r; k++) sum += tmp[Math.min(height - 1, Math.max(0, y + k)) * width + x];
      dst[y * width + x] = sum / win;
    }
  }
  return dst;
}

export type RefineDepthOptions = {
  /** 局所窓の半径 */
  radius?: number;
  /** 平滑度（大きいほどエッジ以外を強く均す） */
  eps?: number;
};

export function refineDepth(
  depth: FloatDepthMap,
  guide: Float32Array,
  options: RefineDepthOptions = {}
): FloatDepthMap {
  const { radius = 4, eps = 1e-3 } = options;
  const { width, height, data: p } = depth;
  const n = p.length;
  if (guide.length !== n) {
    throw new Error("refineDepth: guide と depth のサイズが一致しません");
  }
  const I = guide;

  const meanI = boxFilter(I, width, height, radius);
  const meanP = boxFilter(p, width, height, radius);

  const II = new Float32Array(n);
  const IP = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    II[i] = I[i] * I[i];
    IP[i] = I[i] * p[i];
  }
  const corrI = boxFilter(II, width, height, radius);
  const corrIP = boxFilter(IP, width, height, radius);

  // a·I + b が局所的に p を近似する係数。a=分散に対する共分散比で、エッジでは a→1（ガイドに追従）。
  const a = new Float32Array(n);
  const b = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const varI = corrI[i] - meanI[i] * meanI[i];
    const covIP = corrIP[i] - meanI[i] * meanP[i];
    const ai = covIP / (varI + eps);
    a[i] = ai;
    b[i] = meanP[i] - ai * meanI[i];
  }
  const meanA = boxFilter(a, width, height, radius);
  const meanB = boxFilter(b, width, height, radius);

  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = clamp(meanA[i] * I[i] + meanB[i], 0, 1);
  }
  return { kind: "float32", width, height, data: out };
}
