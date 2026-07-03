// DepthEstimator の生成口（MD §9）。実装差し替えはここに集約。

import type { DepthEstimator } from "../../types";
import { OnnxDepthEstimator } from "./OnnxDepthEstimator";

export type { DepthEstimator };

export function createDepthEstimator(): DepthEstimator {
  return new OnnxDepthEstimator();
}
