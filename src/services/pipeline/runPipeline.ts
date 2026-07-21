// パイプライン（実装ガイド §9〜§16）: 深度推定 → 正規化 → 平滑化 → レイヤー生成 → 資産

import type {
  DepthEstimator,
  ForegroundMask,
  ForegroundSegmenter,
  ModelName,
  OnnxBackend,
  ProcessingStage,
  SegModelName,
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
import { upsampleBilinear } from "./maskOps";
import { bitmapToImageData, rgbPlanesFromImageData } from "../image/canvas";

export type PipelineDeps = {
  estimator: DepthEstimator;
  pre: PreprocessResult;
  imageHash: string;
  model: ModelName;
  backend: OnnxBackend;
  gridX?: number;
  gridY?: number;
  maxLayers?: number;
  depthSide: number;
  /** 前景セグメンタ（seg モデル配置時のみ）。null/未指定なら深度のみで処理する */
  seg?: { segmenter: ForegroundSegmenter; model: SegModelName } | null;
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
    maxLayers,
    depthSide,
    seg,
    startedAt,
    onStage,
    shouldCancel,
  } = deps;

  onStage("estimating-depth", 0.1);
  const raw = await estimator.predict(pre.inference);
  // エッジ整合用ガイド（深度と同寸の RGB planar）を close 前に取り出す
  const guide = rgbPlanesFromImageData(bitmapToImageData(pre.inference, raw.width, raw.height));
  pre.inference.close();
  checkpoint(shouldCancel);

  // 前景セグメンテーション（seg モデル配置時のみ、深度と直列）。
  // 失敗しても深度のみで続行する（部分失敗の隔離）。
  let segMask: ForegroundMask | null = null;
  let segFailReason = "";
  if (seg) {
    onStage("estimating-depth", 0.42);
    try {
      segMask = await seg.segmenter.predict(pre.display);
    } catch (e) {
      segFailReason = e instanceof Error ? `推論失敗: ${e.message}` : "推論失敗";
    }
    checkpoint(shouldCancel);
  }

  onStage("normalizing-depth", 0.5);
  // 正規化 → スパイク除去 → エッジ考慮平滑化（深度エッジを実シルエットへ整合）
  let denoised = normalizeDepth(raw);
  for (let i = 0; i < PIPELINE_DEFAULTS.medianPasses; i++) {
    denoised = medianDepth(denoised, PIPELINE_DEFAULTS.medianRadius);
  }
  const depth = refineDepth(denoised, guide, {
    radius: PIPELINE_DEFAULTS.refineRadius,
    eps: PIPELINE_DEFAULTS.refineEps,
  });
  checkpoint(shouldCancel);

  onStage("building-mesh", 0.7);
  // 多層分割 + 各層のインペイントで遮蔽の穴を根本解消する
  const { layers, seg: segApplied } = await buildLayers({
    depth,
    display: pre.display,
    gridX,
    gridY,
    depthScale: PIPELINE_DEFAULTS.depthScale,
    maxLayers,
    // seg マスクは深度と同寸へ揃えてから渡す（ゲート・融合は深度解像度で行う）
    seg: segMask
      ? upsampleBilinear(segMask.data, segMask.width, segMask.height, depth.width, depth.height)
      : undefined,
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
      segmentation: seg
        ? {
            model: seg.model,
            applied: segApplied?.applied ?? "none",
            reason: segFailReason || segApplied?.reason || undefined,
          }
        : undefined,
      durationMs: Date.now() - startedAt,
    },
  };
  return asset;
}
