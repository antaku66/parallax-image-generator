// 重処理の Worker（実装ガイド §20）。preprocess → depth → pipeline → serialize を担う。
// キャンセルはステージ境界で打ち切り、main 側は jobId で stale イベントを破棄する。

import * as Comlink from "comlink";
import type {
  DepthEstimator,
  ForegroundSegmenter,
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
import { isModelAvailable, isModelUrlAvailable } from "../services/depth/modelManifest";
import { createDepthEstimator } from "../services/depth/DepthEstimator";
import { OnnxForegroundSegmenter } from "../services/segmentation/OnnxForegroundSegmenter";
import { runPipeline } from "../services/pipeline/runPipeline";
import { buildFallbackAsset } from "../services/pipeline/fallbackAsset";
import { serializeAsset } from "../services/cache/serializeAsset";
import { deleteScene, getScene, putScene } from "../services/cache/sceneStore";
import { deserializeAsset } from "../services/cache/deserializeAsset";
import { buildSceneCacheKey } from "../services/cache/sceneCacheKey";
import { collectTransferables } from "../utils/transfer";
import { closeAssetBitmaps } from "../utils/closeAsset";
import { DEFAULT_MODEL, DEFAULT_SEG_MODEL, segModelUrl } from "../constants/models";
import { IMAGE_LIMITS } from "../constants/imageLimits";

const registry = new CancellationRegistry();

// モデルごとにローダをキャッシュ（再ロードを避ける）
let estimator: DepthEstimator | null = null;
let loadedModel: ModelName | null = null;
let loadedInputSide: number | null = null;
// 並走ジョブによる load 競合（二重ロード・片方のセッションリーク）を防ぐ直列化チェーン
let estimatorChain: Promise<unknown> = Promise.resolve();

function ensureEstimator(
  model: ModelName,
  inputSide: number,
  onProgress: (loaded: number, total: number) => void
): Promise<DepthEstimator> {
  const next = estimatorChain.then(async () => {
    if (estimator && loadedModel === model && loadedInputSide === inputSide) return estimator;
    if (estimator) {
      estimator.dispose();
      estimator = null;
      loadedModel = null;
      loadedInputSide = null;
    }
    const e = createDepthEstimator();
    await e.load({ model, backend: "auto", inputSide, onDownloadProgress: onProgress });
    estimator = e;
    loadedModel = model;
    loadedInputSide = inputSide;
    return e;
  });
  estimatorChain = next.catch(() => undefined);
  return next;
}

// seg モデルは任意配置。ロード成功後はセッションを再利用する（深度側と同じ直列化パターン）
let segmenter: ForegroundSegmenter | null = null;
let segChain: Promise<unknown> = Promise.resolve();

function ensureSegmenter(
  onProgress: (loaded: number, total: number) => void
): Promise<ForegroundSegmenter | null> {
  const next = segChain.then(async () => {
    if (segmenter) return segmenter;
    try {
      const s = new OnnxForegroundSegmenter();
      await s.load({ model: DEFAULT_SEG_MODEL, onDownloadProgress: onProgress });
      segmenter = s;
    } catch {
      // ロード失敗は seg なしで続行（部分失敗の隔離）。次ジョブで再試行する
      return null;
    }
    return segmenter;
  });
  segChain = next.catch(() => null);
  return next;
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
    // seg モデルの配置有無はキーに含める（配置/撤去だけで該当資産を自動再生成する）
    const segAvailable = await isModelUrlAvailable(segModelUrl(DEFAULT_SEG_MODEL));
    const cacheKey = buildSceneCacheKey(hash, model, tier, segAvailable ? DEFAULT_SEG_MODEL : null);

    // キャッシュ確認（実装ガイド §21）
    const cached = await getScene(cacheKey);
    if (cached) {
      if (shouldCancel()) return;
      try {
        const asset = await deserializeAsset(cached);
        if (shouldCancel()) {
          closeAssetBitmaps(asset);
          return;
        }
        emitProgress("finalizing", 1);
        emitComplete(asset);
        return;
      } catch {
        // 壊れたエントリ（Blob 破損等）は削除し、通常処理で再生成する
        await deleteScene(cacheKey).catch(() => {});
      }
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
      const est = await ensureEstimator(model, IMAGE_LIMITS[tier].depthSide, (loaded, total) =>
        emitProgress("loading-model", 0.06 + 0.04 * (total ? loaded / total : 0))
      );
      // seg は配置時のみロード（進捗は深度モデルと同じ帯に配分。失敗時は null で続行）
      const seg = segAvailable
        ? await ensureSegmenter((loaded, total) =>
            emitProgress("loading-model", 0.06 + 0.04 * (total ? loaded / total : 0))
          )
        : null;
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
        maxLayers: IMAGE_LIMITS[tier].maxLayers,
        depthSide: IMAGE_LIMITS[tier].depthSide,
        seg: seg ? { segmenter: seg, model: DEFAULT_SEG_MODEL } : null,
        startedAt,
        onStage: emitProgress,
        shouldCancel,
      });
      if (shouldCancel()) {
        closeAssetBitmaps(asset);
        return;
      }

      // 保存は転送前に（コピーで）行う
      try {
        const serialized = await serializeAsset(asset);
        await putScene(cacheKey, serialized);
      } catch {
        // 保存失敗は致命的でない
      }
      if (shouldCancel()) {
        closeAssetBitmaps(asset);
        return;
      }

      emitComplete(asset);
    } catch (e) {
      if (e instanceof CancelledError) {
        // pre.inference は runPipeline 内で、レイヤーテクスチャは buildLayers 直後の
        // キャンセル判定で解放済み。残る display をここで解放する。
        pre.display.close();
        return;
      }
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
