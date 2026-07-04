// SceneCacheKey の生成と文字列化（実装ガイド §21）

import type { SceneCacheKey } from "../../types";
import { MODELS } from "../../constants/models";
import { PROCESSING_VERSION } from "../../constants/versions";
import type { ModelName } from "../../types";
import type { ImageLimitTier } from "../../constants/imageLimits";

export function buildSceneCacheKey(
  imageHash: string,
  model: ModelName,
  tier: ImageLimitTier
): SceneCacheKey {
  return {
    imageHash,
    modelName: model,
    modelVersion: MODELS[model].version,
    processingVersion: PROCESSING_VERSION,
    tier,
  };
}

/** IndexedDB の主キー用に安定文字列化 */
export function sceneCacheKeyString(key: SceneCacheKey): string {
  return [key.imageHash, key.modelName, key.modelVersion, key.processingVersion, key.tier].join(
    "|"
  );
}
