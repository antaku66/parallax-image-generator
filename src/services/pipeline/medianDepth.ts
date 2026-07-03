// 深度スパイク除去の中央値フィルタ（MD §11）。
// 葉むら等で生じる孤立した「手前」ノイズ（浮遊断片の原因）を、
// エッジを保ったまま落とす。境界はクランプ。

import type { FloatDepthMap } from "../../types";

export function medianDepth(depth: FloatDepthMap, radius = 1): FloatDepthMap {
  if (radius <= 0) return depth;
  const { width, height, data } = depth;
  const out = new Float32Array(data.length);
  const win = new Float32Array((radius * 2 + 1) * (radius * 2 + 1));

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let count = 0;
      for (let dy = -radius; dy <= radius; dy++) {
        const sy = Math.min(height - 1, Math.max(0, y + dy));
        for (let dx = -radius; dx <= radius; dx++) {
          const sx = Math.min(width - 1, Math.max(0, x + dx));
          win[count++] = data[sy * width + sx];
        }
      }
      // 小窓なので挿入ソートで中央値を取るのが速い
      for (let i = 1; i < count; i++) {
        const v = win[i];
        let j = i - 1;
        while (j >= 0 && win[j] > v) {
          win[j + 1] = win[j];
          j--;
        }
        win[j + 1] = v;
      }
      out[y * width + x] = win[count >> 1];
    }
  }

  return { kind: "float32", width, height, data: out };
}
