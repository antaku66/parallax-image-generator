// パイプライン（実装ガイド §9〜§16）: 深度推定 → 正規化 → 平滑化 → レイヤー生成 → 資産

import type {
  DepthEstimator,
  ModelName,
  OnnxBackend,
  ProcessingStage,
  SpatialSceneAsset,
} from "../../types";
import { ASSET_VERSION, PROCESSING_VERSION } from "../../constants/versions";
import { PIPELINE_DEFAULTS } from "../../constants/pipeline";
import { MODELS } from "../../constants/models";
import type { PreprocessResult } from "../image/preprocess";
import { checkpoint } from "../../worker/cancellation";
import { normalizeDepth } from "./normalizeDepth";
import { medianDepth } from "./medianDepth";
import { refineDepth } from "./refineDepth";
import { buildLayers } from "./buildLayers";
import { bitmapToImageData, luminanceFromImageData } from "../image/canvas";

export type PipelineDeps = {
  estimator: DepthEstimator;
  pre: PreprocessResult;
  imageHash: string;
  model: ModelName;
  backend: OnnxBackend;
  gridX?: number;
  gridY?: number;
  depthSide: number;
  startedAt: number;
  onStage: (stage: ProcessingStage, progress: number) => void;
  shouldCancel: () => boolean;
};

export async function runPipeline(deps: PipelineDeps): Promise<SpatialSceneAsset> {
  const {
    estimator,
    pre,
    imageHash,
    model,
    backend,
    gridX = PIPELINE_DEFAULTS.gridX,
    gridY = PIPELINE_DEFAULTS.gridY,
    depthSide,
    startedAt,
    onStage,
    shouldCancel,
  } = deps;

  onStage("estimating-depth", 0.1);
  const raw = await estimator.predict(pre.inference);
  // エッジ整合用ガイド（深度と同寸の RGB 輝度）を close 前に取り出す
  const guide = luminanceFromImageData(bitmapToImageData(pre.inference, raw.width, raw.height));
  pre.inference.close();
  checkpoint(shouldCancel);

  onStage("normalizing-depth", 0.5);
  // 正規化 → スパイク除去 → エッジ考慮平滑化（深度エッジを実シルエットへ整合）
  const normalized = normalizeDepth(raw);
  const denoised = medianDepth(normalized, PIPELINE_DEFAULTS.medianRadius);
  const depth = refineDepth(denoised, guide, {
    radius: PIPELINE_DEFAULTS.refineRadius,
    eps: PIPELINE_DEFAULTS.refineEps,
  });
  checkpoint(shouldCancel);

  onStage("building-mesh", 0.7);
  // 前景/背景分離 + 背景インペイントで遮蔽の穴を根本解消する
  const layers = await buildLayers({
    depth,
    display: pre.display,
    gridX,
    gridY,
    depthScale: PIPELINE_DEFAULTS.depthScale,
  });
  if (shouldCancel()) {
    // 生成済みのレイヤーテクスチャを解放してから打ち切る（display は呼び出し側が解放）
    for (const layer of layers) layer.texture.close();
    checkpoint(shouldCancel);
  }

  onStage("finalizing", 0.95);
  const asset: SpatialSceneAsset = {
    version: ASSET_VERSION,
    source: {
      imageHash,
      originalWidth: pre.originalWidth,
      originalHeight: pre.originalHeight,
      display: pre.display,
      displayWidth: pre.displayWidth,
      displayHeight: pre.displayHeight,
      mime: pre.mime,
    },
    depthMap: depth,
    layers,
    metadata: {
      createdAt: startedAt,
      model,
      modelVersion: MODELS[model].version,
      processingVersion: PROCESSING_VERSION,
      backend,
      depthSide,
      pipeline: {
        gridX,
        gridY,
        depthScale: PIPELINE_DEFAULTS.depthScale,
      },
      durationMs: Date.now() - startedAt,
    },
  };
  return asset;
}
