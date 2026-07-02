// 重処理の Worker（実装ガイド §20）。preprocess → depth → pipeline → serialize を担う。
// キャンセルはステージ境界で打ち切り、main 側は jobId で stale イベントを破棄する。

import * as Comlink from "comlink";
import type {
  DepthEstimator,
  ModelName,
  ProcessingStage,
  SpatialSceneAsset,
} from "../types";
import type {
  ProcessingEventCallback,
  ProcessingWorkerApi,
  StartRequest,
} from "./processingApi";
import { CancellationRegistry, CancelledError } from "./cancellation";
import { resolveImageTier } from "../services/device/deviceTier";
import { preprocessImage } from "../services/image/preprocess";
import { hashFile } from "../services/hash/imageHash";
import { isModelAvailable } from "../services/depth/modelManifest";
import { createDepthEstimator } from "../services/depth/DepthEstimator";
import { runPipeline } from "../services/pipeline/runPipeline";
import { buildFallbackAsset } from "../services/pipeline/fallbackAsset";
import { serializeAsset } from "../services/cache/serializeAsset";
import { getScene, putScene } from "../services/cache/sceneStore";
import { deserializeAsset } from "../services/cache/deserializeAsset";
import { buildSceneCacheKey } from "../services/cache/sceneCacheKey";
import { collectTransferables } from "../utils/transfer";
import { DEFAULT_MODEL, MODELS } from "../constants/models";
import { IMAGE_LIMITS } from "../constants/imageLimits";

const registry = new CancellationRegistry();

// モデルごとにローダをキャッシュ（再ロードを避ける）
let estimator: DepthEstimator | null = null;
let loadedModel: ModelName | null = null;

async function ensureEstimator(
  model: ModelName,
  onProgress: (loaded: number, total: number) => void
): Promise<DepthEstimator> {
  if (estimator && loadedModel === model) return estimator;
  if (estimator) {
    estimator.dispose();
    estimator = null;
  }
  const e = createDepthEstimator();
  await e.load({ model, backend: "auto", onDownloadProgress: onProgress });
  estimator = e;
  loadedModel = model;
  return e;
}

async function start(req: StartRequest, onEvent: ProcessingEventCallback): Promise<void> {
  const { id, file } = req;
  registry.clear(id);
  const startedAt = Date.now();
  const shouldCancel = () => registry.isCancelled(id);
  const emitProgress = (stage: ProcessingStage, progress: number) =>
    onEvent({ type: "progress", id, stage, progress });
  const emitComplete = (asset: SpatialSceneAsset) =>
    onEvent(Comlink.transfer({ type: "complete", id, asset }, collectTransferables(asset)));

  try {
    emitProgress("preprocessing-image", 0.04);
    const hash = await hashFile(file);
    if (shouldCancel()) return;

    const model = DEFAULT_MODEL;
    const tier = resolveImageTier();
    const cacheKey = buildSceneCacheKey(hash, model);

    // キャッシュ確認（実装ガイド §21）
    const cached = await getScene(cacheKey);
    if (cached) {
      if (shouldCancel()) return;
      const asset = await deserializeAsset(cached);
      emitProgress("finalizing", 1);
      emitComplete(asset);
      return;
    }

    const pre = await preprocessImage(file, tier, file.type);
    if (shouldCancel()) {
      pre.inference.close();
      pre.display.close();
      return;
    }

    // モデル未配置 → CSS/Canvas フォールバック（実装ガイド §23）
    emitProgress("loading-model", 0.06);
    if (!(await isModelAvailable(model))) {
      const fallback = await buildFallbackAsset(pre, hash, startedAt);
      onEvent(
        Comlink.transfer(
          {
            type: "error",
            id,
            message: "深度モデルが見つかりません。簡易表示に切り替えます。",
            fallbackAsset: fallback,
          },
          collectTransferables(fallback)
        )
      );
      return;
    }

    try {
      const est = await ensureEstimator(model, (loaded, total) =>
        emitProgress("loading-model", 0.06 + 0.04 * (total ? loaded / total : 0))
      );
      if (shouldCancel()) {
        pre.inference.close();
        pre.display.close();
        return;
      }

      const asset = await runPipeline({
        estimator: est,
        pre,
        imageHash: hash,
        model,
        backend: est.backend ?? "wasm",
        gridX: IMAGE_LIMITS[tier].meshGrid,
        gridY: IMAGE_LIMITS[tier].meshGrid,
        depthSide: MODELS[model].inputSide,
        startedAt,
        onStage: emitProgress,
        shouldCancel,
      });
      if (shouldCancel()) return;

      // 保存は転送前に（コピーで）行う
      try {
        const serialized = await serializeAsset(asset);
        await putScene(cacheKey, serialized);
      } catch {
        // 保存失敗は致命的でない
      }
      if (shouldCancel()) return;

      emitComplete(asset);
    } catch (e) {
      if (e instanceof CancelledError) return;
      // 推論・バックエンド失敗時も CSS/Canvas フォールバックへ降格（実装ガイド §23）
      const fallback = await buildFallbackAsset(pre, hash, startedAt);
      onEvent(
        Comlink.transfer(
          {
            type: "error",
            id,
            message:
              e instanceof Error
                ? `深度処理に失敗したため簡易表示に切り替えます（${e.message}）`
                : "深度処理に失敗しました。簡易表示に切り替えます。",
            fallbackAsset: fallback,
          },
          collectTransferables(fallback)
        )
      );
    }
  } catch (err) {
    if (err instanceof CancelledError) return;
    onEvent({
      type: "error",
      id,
      message: err instanceof Error ? err.message : "処理に失敗しました",
    });
  } finally {
    registry.clear(id);
  }
}

const api: ProcessingWorkerApi = {
  start,
  cancel: (id: string) => registry.cancel(id),
};

Comlink.expose(api);
