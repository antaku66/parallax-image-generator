// 保存用 → ランタイム資産（実装ガイド §7）。Blob から ImageBitmap、量子化深度から Float へ復元。

import type {
  QuantizedDepthMap,
  SceneLayer,
  SceneMesh,
  SerializedSceneLayer,
  SerializedSceneMesh,
  SerializedSpatialSceneAsset,
  SpatialSceneAsset,
} from "../../types";
import { dequantizeDepth } from "../../utils/quantize";

function deserializeMesh(m: SerializedSceneMesh): SceneMesh {
  return {
    positions: new Float32Array(m.positions),
    uvs: new Float32Array(m.uvs),
    indices: new Uint32Array(m.indices),
    gridX: m.gridX,
    gridY: m.gridY,
    vertexCount: m.vertexCount,
    triangleCount: m.triangleCount,
  };
}

async function deserializeLayer(l: SerializedSceneLayer): Promise<SceneLayer> {
  return {
    id: l.id,
    depthRange: l.depthRange,
    texture: await createImageBitmap(l.textureBlob),
    mesh: l.mesh ? deserializeMesh(l.mesh) : undefined,
    parallax: l.parallax,
  };
}

export async function deserializeAsset(
  s: SerializedSpatialSceneAsset
): Promise<SpatialSceneAsset> {
  const display = await createImageBitmap(s.source.displayBlob);

  const quantized: QuantizedDepthMap = {
    kind: s.depthMap.kind,
    width: s.depthMap.width,
    height: s.depthMap.height,
    data:
      s.depthMap.kind === "uint8"
        ? new Uint8Array(s.depthMap.buffer)
        : new Uint16Array(s.depthMap.buffer),
  };
  const depthMap = dequantizeDepth(quantized);

  const layers = await Promise.all(s.layers.map(deserializeLayer));

  return {
    version: s.version,
    source: {
      imageHash: s.source.imageHash,
      originalWidth: s.source.originalWidth,
      originalHeight: s.source.originalHeight,
      display,
      displayWidth: s.source.displayWidth,
      displayHeight: s.source.displayHeight,
      mime: s.source.mime,
    },
    depthMap,
    layers,
    metadata: s.metadata,
  };
}
