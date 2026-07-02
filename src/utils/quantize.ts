// 深度の量子化（保存用, MD §7）

import type { FloatDepthMap, QuantizedDepthMap } from "../types";
import { clamp } from "./clamp";

export function quantizeDepth(
  depth: FloatDepthMap,
  kind: "uint8" | "uint16"
): QuantizedDepthMap {
  const max = kind === "uint8" ? 255 : 65535;
  const src = depth.data;
  const out = kind === "uint8" ? new Uint8Array(src.length) : new Uint16Array(src.length);
  for (let i = 0; i < src.length; i++) {
    out[i] = Math.round(clamp(src[i], 0, 1) * max);
  }
  return { kind, width: depth.width, height: depth.height, data: out };
}

export function dequantizeDepth(q: QuantizedDepthMap): FloatDepthMap {
  const max = q.kind === "uint8" ? 255 : 65535;
  const out = new Float32Array(q.data.length);
  for (let i = 0; i < q.data.length; i++) {
    out[i] = q.data[i] / max;
  }
  return { kind: "float32", width: q.width, height: q.height, data: out };
}
