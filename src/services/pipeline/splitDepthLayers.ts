// 深度をレイヤーへ分割するしきい値（再帰的 Otsu）と累積 near 側ソフトマスクを求める。
// 入力は refined 深度（0=far / 1=near）。
//
// 全区間の Otsu 二分割を貪欲に繰り返し、次のゲートを通過する候補だけを採択する:
//   1. 遷移帯（±margin）の質量が maxBandMassRatio 以下（にじみ帯の可視性 veto）
//   2. 分離度 η が高い、または遷移帯が実質空（emptyBandMassRatio 以下）
//   3. 分割後の両スラブ質量・しきい値間隔が十分
// 採択ゼロなら単層（thresholds 空）で、従来の「分離度が低い画像は分割しない」
// フォールバックと連続的な挙動になる。

import type { FloatDepthMap } from "../../types";
import { PIPELINE_DEFAULTS } from "../../constants/pipeline";
import { clamp } from "../../utils/clamp";

export type DepthSplit = {
  /** レイヤー境界の深度しきい値（[0,1]、昇順、長さ = 層数 - 1。単層なら空） */
  thresholds: number[];
  /** 各しきい値の near 側累積ソフトマスク M_k（[0,1]、thresholds と同順・深度と同寸） */
  cumulativeMasks: Float32Array[];
  /**
   * 全区間 Otsu（最初の分割候補）の分離度 η = クラス間分散 / 全分散（[0,1]）。
   * 低いほど深度分布が連続的で分割に向かない（診断・テスト用）。
   * 目安: 明確な二峰 > 0.85、一様分布（連続的な奥行き）≈ 0.75、単一ガウス ≈ 0.64。
   */
  separability: number;
};

export type DepthSplitOptions = {
  /** ソフトマスクの遷移半幅（深度単位） */
  margin?: number;
  /** レイヤー数の上限（しきい値は最大 maxLayers - 1 個） */
  maxLayers?: number;
  /** 分割を採択する区間内分離度 η の下限 */
  minSeparability?: number;
  /** 谷が実質空とみなす遷移帯（±margin）内の質量比（全画素比）。η 下限との OR で採択 */
  emptyBandMassRatio?: number;
  /** 遷移帯内の質量比の上限（全画素比）。超えると η によらず棄却（にじみ帯 veto） */
  maxBandMassRatio?: number;
  /** 分割後の各スラブが持つべき最小画素質量比（全画素比） */
  minSlabMassRatio?: number;
  /** しきい値同士・深度端との最小間隔（深度単位） */
  minSlabDepthSpan?: number;
};

const BINS = 256;

type RangeOtsu = { thresholdBin: number; separability: number };

// 区間限定 Otsu 法: bin 区間 [binLo, binHi] 内でクラス間分散を最大化するしきい値と分離度を求める
function otsuOnRange(hist: Float32Array, binLo: number, binHi: number): RangeOtsu {
  const mid = (binLo + binHi) / 2;
  if (binLo > binHi) return { thresholdBin: mid, separability: 0 };

  let total = 0;
  let sumAll = 0;
  for (let i = binLo; i <= binHi; i++) {
    total += hist[i];
    sumAll += i * hist[i];
  }
  if (total === 0) return { thresholdBin: mid, separability: 0 };

  let sumB = 0;
  let wB = 0;
  let maxVar = -1;
  // 最大分散が谷（ヒストグラムの空き帯）で一定値のプラトーになるため、
  // その中点を採ることで二峰の谷の中央にしきい値を置く。
  let lo = mid;
  let hi = mid;
  for (let i = binLo; i <= binHi; i++) {
    wB += hist[i];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += i * hist[i];
    const mB = sumB / wB;
    const mF = (sumAll - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > maxVar + 1e-9) {
      maxVar = between;
      lo = i;
      hi = i;
    } else if (between >= maxVar - 1e-9) {
      hi = i;
    }
  }

  // 区間内全分散（bin 単位）に対する最大クラス間分散の比（η）
  const mean = sumAll / total;
  let varT = 0;
  for (let i = binLo; i <= binHi; i++) varT += hist[i] * (i - mean) * (i - mean);
  varT /= total;
  const sigmaB = maxVar > 0 ? maxVar / (total * total) : 0;
  const separability = varT > 1e-9 ? Math.min(1, sigmaB / varT) : 0;

  return { thresholdBin: (lo + hi) / 2, separability };
}

/** 既存しきい値で区切られた深度スラブ（bin 区間 + 深度単位の境界） */
type Segment = { binLo: number; binHi: number; depthLo: number; depthHi: number };

type Candidate = Segment & {
  /** 分割しきい値（深度単位） */
  t: number;
  /** 分割しきい値（fractional bin。子区間の切り出しに使う） */
  tBin: number;
  separability: number;
  /** 採択ゲート（η または谷の空虚度、＋質量・間隔）を通過したか */
  ok: boolean;
};

export function splitDepthLayers(depth: FloatDepthMap, opts: DepthSplitOptions = {}): DepthSplit {
  const {
    margin = PIPELINE_DEFAULTS.splitMargin,
    maxLayers = 4,
    minSeparability = PIPELINE_DEFAULTS.minSplitSeparability,
    emptyBandMassRatio = PIPELINE_DEFAULTS.emptyBandMassRatio,
    maxBandMassRatio = PIPELINE_DEFAULTS.maxBandMassRatio,
    minSlabMassRatio = PIPELINE_DEFAULTS.minSlabMassRatio,
    minSlabDepthSpan = PIPELINE_DEFAULTS.minSlabDepthSpan,
  } = opts;

  const data = depth.data;
  const hist = new Float32Array(BINS);
  for (let i = 0; i < data.length; i++) {
    const b = Math.min(BINS - 1, Math.max(0, Math.round(data[i] * (BINS - 1))));
    hist[b]++;
  }
  // 累積質量（prefix[i] = bin [0..i] の画素数）。スラブ質量ゲートに使う
  const prefix = new Float32Array(BINS);
  let acc = 0;
  for (let i = 0; i < BINS; i++) {
    acc += hist[i];
    prefix[i] = acc;
  }
  const massIn = (binLo: number, binHi: number): number =>
    binLo > binHi ? 0 : prefix[Math.min(binHi, BINS - 1)] - (binLo > 0 ? prefix[binLo - 1] : 0);
  const minMass = minSlabMassRatio * data.length;

  const evaluate = (seg: Segment): Candidate => {
    const { thresholdBin, separability } = otsuOnRange(hist, seg.binLo, seg.binHi);
    const t = thresholdBin / (BINS - 1);
    const splitBin = Math.floor(thresholdBin);
    // 遷移帯（±margin）の質量 = 中間アルファになる画素の量。静止時も下層インペイントと
    // 混ざって「にじみ帯」として見えるため、多すぎる分割は η によらず棄却する。
    // 逆に実質空（谷）なら、分割しても汚染画素がほぼ無いので η が低くても許す
    // （多峰分布では二分割 η が本質的に下がるため）。
    const bandMass = massIn(
      Math.max(0, Math.ceil((t - margin) * (BINS - 1))),
      Math.min(BINS - 1, Math.floor((t + margin) * (BINS - 1)))
    );
    const ok =
      bandMass <= maxBandMassRatio * data.length &&
      (separability >= minSeparability || bandMass <= emptyBandMassRatio * data.length) &&
      massIn(seg.binLo, splitBin) >= minMass &&
      massIn(splitBin + 1, seg.binHi) >= minMass &&
      t - seg.depthLo >= minSlabDepthSpan &&
      seg.depthHi - t >= minSlabDepthSpan;
    return { ...seg, t, tBin: thresholdBin, separability, ok };
  };

  // 貪欲 best-first: ゲート通過候補のうち η 最大の分割から順に採択する
  const root = evaluate({ binLo: 0, binHi: BINS - 1, depthLo: 0, depthHi: 1 });
  const candidates: Candidate[] = [root];
  const thresholds: number[] = [];
  while (thresholds.length < maxLayers - 1) {
    let bestIdx = -1;
    for (let i = 0; i < candidates.length; i++) {
      if (!candidates[i].ok) continue;
      if (bestIdx < 0 || candidates[i].separability > candidates[bestIdx].separability) bestIdx = i;
    }
    if (bestIdx < 0) break;
    const [c] = candidates.splice(bestIdx, 1);
    thresholds.push(c.t);
    const splitBin = Math.floor(c.tBin);
    candidates.push(
      evaluate({ binLo: c.binLo, binHi: splitBin, depthLo: c.depthLo, depthHi: c.t }),
      evaluate({ binLo: splitBin + 1, binHi: c.binHi, depthLo: c.t, depthHi: c.depthHi })
    );
  }
  thresholds.sort((a, b) => a - b);

  // 各しきい値の near 側累積マスク。しきい値の間隔 ≥ minSlabDepthSpan > 2×margin のため
  // 遷移帯は重ならず、M_k ≥ M_{k+1} の単調性が保たれる。
  const cumulativeMasks = thresholds.map((t) => {
    const mask = new Float32Array(data.length);
    const lo = t - margin;
    const hi = t + margin;
    const span = Math.max(1e-6, hi - lo);
    for (let i = 0; i < mask.length; i++) {
      // smoothstep(lo, hi, depth): near(>hi)=1, far(<lo)=0 の柔らかいマスク
      const s = clamp((data[i] - lo) / span, 0, 1);
      mask[i] = s * s * (3 - 2 * s);
    }
    return mask;
  });

  return { thresholds, cumulativeMasks, separability: root.separability };
}
