import { describe, it, expect } from "vitest";
import { evaluateSegGate } from "../segmentationGate";

// 8×8 の合成シーン: 中央 4×4 が被写体（seg=1, 深度 0.8）、周囲は背景（seg=0, 深度 0.2）
const W = 8;
const H = 8;

function makeScene(overrides?: {
  seg?: (x: number, y: number) => number;
  depth?: (x: number, y: number) => number;
  cum?: (x: number, y: number) => number;
}) {
  const inSubject = (x: number, y: number) => x >= 2 && x < 6 && y >= 2 && y < 6;
  const seg = new Float32Array(W * H);
  const depth = new Float32Array(W * H);
  const cum = new Float32Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      seg[i] = overrides?.seg?.(x, y) ?? (inSubject(x, y) ? 1 : 0);
      depth[i] = overrides?.depth?.(x, y) ?? (inSubject(x, y) ? 0.8 : 0.2);
      cum[i] = overrides?.cum?.(x, y) ?? (inSubject(x, y) ? 1 : 0);
    }
  }
  return { seg, depth, cum };
}

describe("evaluateSegGate", () => {
  it("深度前面と一致する明瞭な被写体は strong", () => {
    const { seg, depth, cum } = makeScene();
    const result = evaluateSegGate(seg, depth, cum);
    expect(result.mode).toBe("strong");
  });

  it("被写体なし（面積比が下限未満）は none", () => {
    const { depth, cum } = makeScene();
    const seg = new Float32Array(W * H); // 全 0
    expect(evaluateSegGate(seg, depth, cum).mode).toBe("none");
  });

  it("画面ほぼ全体が被写体（面積比が上限超過）は none", () => {
    const { depth, cum } = makeScene();
    const seg = new Float32Array(W * H).fill(1);
    expect(evaluateSegGate(seg, depth, cum).mode).toBe("none");
  });

  it("グレーだらけの低信頼マスク（ソフト率超過）は none", () => {
    const { depth, cum } = makeScene();
    // 被写体 16px 中 8px を中間値にする（ソフト率 0.5 > 0.35）
    const { seg } = makeScene({
      seg: (x, y) => (x >= 2 && x < 6 && y >= 2 && y < 6 ? (y < 4 ? 0.6 : 1) : 0),
    });
    expect(evaluateSegGate(seg, depth, cum).mode).toBe("none");
  });

  it("被写体が手前でない（深度整合不足）は none", () => {
    // seg は中央を被写体と言うが、深度は全画素ほぼ同じ（柵越し等の誤適用を防ぐ）
    const { seg, cum } = makeScene();
    const depth = new Float32Array(W * H).fill(0.5);
    expect(evaluateSegGate(seg, depth, cum).mode).toBe("none");
  });

  it("深度前面と部分一致（IoU 中程度）は band", () => {
    // 深度前面は seg より 1 列広い（IoU = 16/20 = 0.8 → strong）ではなく
    // 2 列ずらして交差を減らす（交差 8 / 和 24 = 0.33 → none にならないよう調整）
    // seg 4×4 に対し cum を右へ 1 列シフト: 交差 12, 和 20 → IoU 0.6 → band
    const { seg, depth } = makeScene();
    const { cum } = makeScene({ cum: (x, y) => (x >= 3 && x < 7 && y >= 2 && y < 6 ? 1 : 0) });
    const result = evaluateSegGate(seg, depth, cum);
    expect(result.mode).toBe("band");
  });

  it("深度前面と不一致（IoU 不足）は none", () => {
    // cum が seg と重ならない別領域を前面とみなしている
    const { seg, depth } = makeScene();
    const { cum } = makeScene({ cum: (x, y) => (x < 2 && y < 4 ? 1 : 0) });
    expect(evaluateSegGate(seg, depth, cum).mode).toBe("none");
  });
});
