// CSS/Canvas フォールバック用の資産（実装ガイド §23）。
// depth 推論が使えない/失敗した場合に、レイヤー無しの資産を返す。
// UI 側は layers の有無で Three ビューアか CSS フォールバックかを切り替える。

import type { FloatDepthMap, SpatialSceneAsset } from "../../types";
import { ASSET_VERSION, PROCESSING_VERSION } from "../../constants/versions";
import { DEFAULT_MODEL, MODELS } from "../../constants/models";
import { PIPELINE_DEFAULTS } from "../../constants/pipeline";
import type { PreprocessResult } from "../image/preprocess";

export async function buildFallbackAsset(
  pre: PreprocessResult,
  imageHash: string,
  startedAt: number
): Promise<SpatialSceneAsset> {
  // 推論用ビットマップは使わないので解放
  pre.inference.close();
  const depthMap: FloatDepthMap = {
    kind: "float32",
    width: 1,
    height: 1,
    data: new Float32Array([0.5]),
  };

  return {
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
    depthMap,
    // layers 空 = CSS フォールバック
    layers: [],
    metadata: {
      createdAt: startedAt,
      model: DEFAULT_MODEL,
      modelVersion: MODELS[DEFAULT_MODEL].version,
      processingVersion: PROCESSING_VERSION,
      backend: "wasm",
      depthSide: 0,
      pipeline: {
        gridX: PIPELINE_DEFAULTS.gridX,
        gridY: PIPELINE_DEFAULTS.gridY,
        depthScale: PIPELINE_DEFAULTS.depthScale,
      },
      durationMs: Date.now() - startedAt,
    },
  };
}
