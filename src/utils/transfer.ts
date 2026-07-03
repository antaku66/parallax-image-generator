// ランタイム資産から Transferable を収集（Comlink.transfer 用, 実装ガイド §5/§26.8）
//
// 注意: ここで集めたバッファは転送後に Worker 側で detach される。
// IndexedDB 保存は転送前に量子化コピーで済ませておくこと。

import type { SpatialSceneAsset } from "../types";

export function collectTransferables(asset: SpatialSceneAsset): Transferable[] {
  const list: Transferable[] = [];
  const seen = new Set<Transferable>();
  const push = (t: Transferable | undefined | null) => {
    if (t && !seen.has(t)) {
      seen.add(t);
      list.push(t);
    }
  };

  push(asset.depthMap.data.buffer as ArrayBuffer);
  push(asset.source.display);
  for (const layer of asset.layers) {
    push(layer.texture);
    if (layer.mesh) {
      push(layer.mesh.positions.buffer as ArrayBuffer);
      push(layer.mesh.uvs.buffer as ArrayBuffer);
      push(layer.mesh.indices.buffer as ArrayBuffer);
    }
  }
  return list;
}
