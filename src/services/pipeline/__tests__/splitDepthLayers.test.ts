import { describe, it, expect } from "vitest";
import { splitDepthLayers } from "../splitDepthLayers";
import type { FloatDepthMap } from "../../../types";

function fdm(data: number[], w: number, h: number): FloatDepthMap {
  return { kind: "float32", width: w, height: h, data: Float32Array.from(data) };
}

/** 三峰: 40% far(0.1) / 35% mid(0.5) / 25% near(0.9)。20 画素 */
function trimodal(): FloatDepthMap {
  const d = [
    ...(Array(8).fill(0.1) as number[]),
    ...(Array(7).fill(0.5) as number[]),
    ...(Array(5).fill(0.9) as number[]),
  ];
  return fdm(d, 5, 4);
}

describe("splitDepthLayers", () => {
  it("二峰性の深度で 1 しきい値、near 側 =1 / far 側 =0 の累積マスクを返す", () => {
    // 左半分 far(0.1)、右半分 near(0.9)
    const w = 8;
    const h = 4;
    const d: number[] = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) d.push(x < w / 2 ? 0.1 : 0.9);
    const { thresholds, cumulativeMasks } = splitDepthLayers(fdm(d, w, h));
    expect(thresholds).toHaveLength(1);
    expect(thresholds[0]).toBeGreaterThan(0.1);
    expect(thresholds[0]).toBeLessThan(0.9);
    expect(cumulativeMasks[0][0]).toBeCloseTo(0, 3); // far
    expect(cumulativeMasks[0][w - 1]).toBeCloseTo(1, 3); // near
  });

  it("三峰性の深度で 2 しきい値を昇順に返し、各モードの間に置く", () => {
    const { thresholds } = splitDepthLayers(trimodal());
    expect(thresholds).toHaveLength(2);
    expect(thresholds[0]).toBeGreaterThan(0.1);
    expect(thresholds[0]).toBeLessThan(0.5);
    expect(thresholds[1]).toBeGreaterThan(0.5);
    expect(thresholds[1]).toBeLessThan(0.9);
  });

  it("maxLayers でしきい値数が制限される", () => {
    const { thresholds } = splitDepthLayers(trimodal(), { maxLayers: 2 });
    expect(thresholds).toHaveLength(1);
  });

  it("質量ゲート: 極小スラブ（minSlabMassRatio 未満）には分割しない", () => {
    // 99% near / 1% far → far スラブの質量不足で単層
    const w = 10;
    const h = 10;
    const d = new Array(w * h).fill(0.95) as number[];
    d[0] = 0.0;
    const { thresholds } = splitDepthLayers(fdm(d, w, h));
    expect(thresholds).toHaveLength(0);
  });

  it("間隔ゲート: 深度端に近すぎるしきい値は採択しない", () => {
    // 両モードとも far 端付近 → しきい値が端から minSlabDepthSpan 未満
    const w = 8;
    const h = 4;
    const d: number[] = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) d.push(x < w / 2 ? 0.02 : 0.1);
    const { thresholds } = splitDepthLayers(fdm(d, w, h));
    expect(thresholds).toHaveLength(0);
  });

  it("にじみ帯 veto: 遷移帯の質量が多い分割は η によらず棄却する", () => {
    // 一様ランプは任意のしきい値で遷移帯（±0.06 = 範囲の 12%）に質量を持つ。
    // η ゲートを無効化しても帯質量の上限で分割されないことを確認する
    const ramp = Array.from({ length: 256 }, (_, i) => i / 255);
    const { thresholds } = splitDepthLayers(fdm(ramp, 16, 16), { minSeparability: 0 });
    expect(thresholds).toHaveLength(0);
  });

  it("累積マスクは [0,1] に収まり M_k ≥ M_{k+1} の単調性を持つ", () => {
    const depth = trimodal();
    const { cumulativeMasks } = splitDepthLayers(depth);
    expect(cumulativeMasks).toHaveLength(2);
    for (let i = 0; i < depth.data.length; i++) {
      expect(cumulativeMasks[0][i]).toBeGreaterThanOrEqual(0);
      expect(cumulativeMasks[0][i]).toBeLessThanOrEqual(1);
      expect(cumulativeMasks[0][i]).toBeGreaterThanOrEqual(cumulativeMasks[1][i]);
    }
  });

  it("分離度: 明確な二峰は高く、連続的な一様分布は低く単層のまま", () => {
    const w = 16;
    const h = 16;
    // 二峰: far 0.1 / near 0.9 の半々
    const bimodal: number[] = [];
    for (let i = 0; i < w * h; i++) bimodal.push(i < (w * h) / 2 ? 0.1 : 0.9);
    // 連続: 0..1 の一様な傾斜（風景の奥行きの近似）
    const ramp = Array.from({ length: w * h }, (_, i) => i / (w * h - 1));

    const sBimodal = splitDepthLayers(fdm(bimodal, w, h)).separability;
    const rampSplit = splitDepthLayers(fdm(ramp, w, h));

    expect(sBimodal).toBeGreaterThan(0.95); // 2 値なら η ≈ 1
    expect(rampSplit.separability).toBeLessThan(0.8); // 一様分布は η ≈ 0.75
    expect(rampSplit.thresholds).toHaveLength(0); // 遷移帯に質量があり谷ゲートも不通過
  });

  it("分離度は定数深度で 0（全分散ゼロの退化ケース）で分割しない", () => {
    const d = new Array(16).fill(0.5) as number[];
    const { separability, thresholds } = splitDepthLayers(fdm(d, 4, 4));
    expect(separability).toBe(0);
    expect(thresholds).toHaveLength(0);
  });
});
