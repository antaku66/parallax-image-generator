// ランタイム資産 → 保存用（実装ガイド §7）。深度は uint16 に量子化し、表示画像は Blob 化。
// 転送前に呼ぶこと（元バッファを消費しないようコピーする）。

import type {
  SceneLayer,
  SceneMesh,
  SerializedSceneLayer,
  SerializedSceneMesh,
  SerializedSpatialSceneAsset,
  SpatialSceneAsset,
} from "../../types";
import { encodeBitmap } from "../image/canvas";
import { quantizeDepth } from "../../utils/quantize";

function serializeMesh(mesh: SceneMesh): SerializedSceneMesh {
  return {
    positions: mesh.positions.slice().buffer,
    uvs: mesh.uvs.slice().buffer,
    indices: mesh.indices.slice().buffer,
    gridX: mesh.gridX,
    gridY: mesh.gridY,
    vertexCount: mesh.vertexCount,
    triangleCount: mesh.triangleCount,
  };
}

// レイヤーテクスチャはアルファ（前景マット）を含むため webp で符号化する
async function serializeLayer(layer: SceneLayer): Promise<SerializedSceneLayer> {
  return {
    id: layer.id,
    depthRange: layer.depthRange,
    textureBlob: await encodeBitmap(layer.texture, "image/webp", 0.9),
    mesh: layer.mesh ? serializeMesh(layer.mesh) : undefined,
    parallax: layer.parallax,
  };
}

export async function serializeAsset(
  asset: SpatialSceneAsset
): Promise<SerializedSpatialSceneAsset> {
  const depth =
    asset.depthMap.kind === "float32"
      ? quantizeDepth(asset.depthMap, "uint16")
      : asset.depthMap;

  const displayBlob = await encodeBitmap(asset.source.display, "image/webp", 0.9);

  return {
    version: asset.version,
    source: {
      imageHash: asset.source.imageHash,
      originalWidth: asset.source.originalWidth,
      originalHeight: asset.source.originalHeight,
      displayWidth: asset.source.displayWidth,
      displayHeight: asset.source.displayHeight,
      mime: asset.source.mime,
      displayBlob,
    },
    depthMap: {
      kind: depth.kind as "uint8" | "uint16",
      width: depth.width,
      height: depth.height,
      buffer: depth.data.slice().buffer,
    },
    layers: await Promise.all(asset.layers.map(serializeLayer)),
    metadata: asset.metadata,
  };
}
