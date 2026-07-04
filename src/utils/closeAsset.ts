// 資産が抱える ImageBitmap の解放（実装ガイド §5）。
// GPU テクスチャの dispose は threeResources 側の責務で、ここでは CPU 側ビットマップのみ扱う。

import type { SpatialSceneAsset } from "../types";

/** 資産の display / レイヤーテクスチャを close する（同一ビットマップの重複 close は避ける） */
export function closeAssetBitmaps(asset: SpatialSceneAsset): void {
  const seen = new Set<ImageBitmap>();
  const close = (bitmap: ImageBitmap | undefined) => {
    if (bitmap && !seen.has(bitmap)) {
      seen.add(bitmap);
      bitmap.close();
    }
  };
  close(asset.source.display);
  for (const layer of asset.layers) close(layer.texture);
}
