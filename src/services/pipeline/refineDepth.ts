// エッジ考慮の深度精緻化（MD §11）。
// guided filter（He et al.）で画像をガイドに、深度エッジを画像エッジへ整合させつつ平滑化する。
// 前景/背景の境界が実シルエットに一致し、平坦部（葉むら等）のノイズは均される。
// 深度の精緻化はカラーガイド版（輝度が同じ色相境界も識別）、マスクの 2 値化前など
// 精度が要らない用途は輝度ガイド版を使う。

import type { FloatDepthMap } from "../../types";
import { clamp } from "../../utils/clamp";

// 分離型ボックスフィルタ（半径 r の平均）。境界はクランプ。
// 移動和で半径に依らず O(n)。高解像度（テクスチャ解像度のマスク等）でも実用速度を保つ。
export function boxFilter(
  src: Float32Array,
  width: number,
  height: number,
  r: number
): Float32Array {
  const win = r * 2 + 1;
  const tmp = new Float32Array(src.length);
  const dst = new Float32Array(src.length);

  // 水平: 行ごとに初期窓を作り、右へスライド（クランプ境界は端画素の重複加算と等価）
  for (let y = 0; y < height; y++) {
    const row = y * width;
    let sum = 0;
    for (let k = -r; k <= r; k++) sum += src[row + Math.min(width - 1, Math.max(0, k))];
    tmp[row] = sum / win;
    for (let x = 1; x < width; x++) {
      sum += src[row + Math.min(width - 1, x + r)] - src[row + Math.max(0, x - r - 1)];
      tmp[row + x] = sum / win;
    }
  }

  // 垂直: 列ごとの窓合計を保持し、行単位で下へスライド（メモリアクセスを行順に保つ）
  const colSum = new Float64Array(width);
  for (let k = -r; k <= r; k++) {
    const row = Math.min(height - 1, Math.max(0, k)) * width;
    for (let x = 0; x < width; x++) colSum[x] += tmp[row + x];
  }
  for (let x = 0; x < width; x++) dst[x] = colSum[x] / win;
  for (let y = 1; y < height; y++) {
    const addRow = Math.min(height - 1, y + r) * width;
    const subRow = Math.max(0, y - r - 1) * width;
    const dstRow = y * width;
    for (let x = 0; x < width; x++) {
      colSum[x] += tmp[addRow + x] - tmp[subRow + x];
      dst[dstRow + x] = colSum[x] / win;
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

/**
 * guided filter（He et al.）。ガイド I のエッジに整合させながら p を平滑化する。
 * 深度の精緻化のほか、アルファマットのエッジ整合アップサンプリングにも使う。
 * 出力は [0,1] にクランプされる。
 */
export function guidedFilter(
  p: Float32Array,
  I: Float32Array,
  width: number,
  height: number,
  radius: number,
  eps: number
): Float32Array {
  const n = p.length;
  if (I.length !== n) {
    throw new Error("guidedFilter: guide と入力のサイズが一致しません");
  }

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
  return out;
}

/** カラー guided filter のガイド（RGB planar, 各チャンネル [0,1]） */
export type RgbGuide = [Float32Array, Float32Array, Float32Array];

/**
 * カラーガイド版 guided filter（He et al.）。輝度が同じで色相だけ異なる境界
 * （緑葉と赤壁等）でも共分散行列の色方向分散でエッジを識別でき、
 * 輝度 1ch ガイドの取りこぼし（境界を跨ぐ深度・マットの漏れ）を防ぐ。
 * 画素ごとの 3×3 対称行列 (Σ + eps·I) は余因子展開の閉形式で逆行列化する。
 */
export function guidedFilterColor(
  p: Float32Array,
  guide: RgbGuide,
  width: number,
  height: number,
  radius: number,
  eps: number
): Float32Array {
  const n = p.length;
  const [R, G, B] = guide;
  if (R.length !== n || G.length !== n || B.length !== n) {
    throw new Error("guidedFilterColor: guide と入力のサイズが一致しません");
  }

  const mul = (a: Float32Array, b: Float32Array): Float32Array => {
    const o = new Float32Array(n);
    for (let i = 0; i < n; i++) o[i] = a[i] * b[i];
    return o;
  };
  const meanR = boxFilter(R, width, height, radius);
  const meanG = boxFilter(G, width, height, radius);
  const meanB = boxFilter(B, width, height, radius);
  const meanP = boxFilter(p, width, height, radius);
  // 共分散行列の上三角 6 成分 + ガイド×入力 3 成分
  const corrRR = boxFilter(mul(R, R), width, height, radius);
  const corrRG = boxFilter(mul(R, G), width, height, radius);
  const corrRB = boxFilter(mul(R, B), width, height, radius);
  const corrGG = boxFilter(mul(G, G), width, height, radius);
  const corrGB = boxFilter(mul(G, B), width, height, radius);
  const corrBB = boxFilter(mul(B, B), width, height, radius);
  const corrRP = boxFilter(mul(R, p), width, height, radius);
  const corrGP = boxFilter(mul(G, p), width, height, radius);
  const corrBP = boxFilter(mul(B, p), width, height, radius);

  const aR = new Float32Array(n);
  const aG = new Float32Array(n);
  const aB = new Float32Array(n);
  const b = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    // Σ + eps·I（eps > 0 で正定値のため det > 0）
    const m00 = corrRR[i] - meanR[i] * meanR[i] + eps;
    const m01 = corrRG[i] - meanR[i] * meanG[i];
    const m02 = corrRB[i] - meanR[i] * meanB[i];
    const m11 = corrGG[i] - meanG[i] * meanG[i] + eps;
    const m12 = corrGB[i] - meanG[i] * meanB[i];
    const m22 = corrBB[i] - meanB[i] * meanB[i] + eps;
    const covR = corrRP[i] - meanR[i] * meanP[i];
    const covG = corrGP[i] - meanG[i] * meanP[i];
    const covB = corrBP[i] - meanB[i] * meanP[i];
    const c00 = m11 * m22 - m12 * m12;
    const c01 = m02 * m12 - m01 * m22;
    const c02 = m01 * m12 - m02 * m11;
    const c11 = m00 * m22 - m02 * m02;
    const c12 = m01 * m02 - m00 * m12;
    const c22 = m00 * m11 - m01 * m01;
    const det = m00 * c00 + m01 * c01 + m02 * c02;
    const ar = (c00 * covR + c01 * covG + c02 * covB) / det;
    const ag = (c01 * covR + c11 * covG + c12 * covB) / det;
    const ab = (c02 * covR + c12 * covG + c22 * covB) / det;
    aR[i] = ar;
    aG[i] = ag;
    aB[i] = ab;
    b[i] = meanP[i] - ar * meanR[i] - ag * meanG[i] - ab * meanB[i];
  }
  const meanAR = boxFilter(aR, width, height, radius);
  const meanAG = boxFilter(aG, width, height, radius);
  const meanAB = boxFilter(aB, width, height, radius);
  const meanBias = boxFilter(b, width, height, radius);

  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = clamp(meanAR[i] * R[i] + meanAG[i] * G[i] + meanAB[i] * B[i] + meanBias[i], 0, 1);
  }
  return out;
}

export function refineDepth(
  depth: FloatDepthMap,
  guide: RgbGuide,
  options: RefineDepthOptions = {}
): FloatDepthMap {
  const { radius = 4, eps = 1e-3 } = options;
  const { width, height, data } = depth;
  return {
    kind: "float32",
    width,
    height,
    data: guidedFilterColor(data, guide, width, height, radius, eps),
  };
}
