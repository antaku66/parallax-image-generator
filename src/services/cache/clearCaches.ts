// アプリが保存した全キャッシュの削除（実装ガイド §22「キャッシュ削除」）

import { clearScenes } from "./sceneStore";

// modelManifest.ts（モデル）と sw.js（シェル/静的資産）のキャッシュ名は
// すべてこのプレフィックスで始まる。列挙方式なのでバージョン更新に追従不要。
const APP_CACHE_PREFIX = "spatial-scene-";

/** 保存済みシーン（IndexedDB）と Cache Storage（モデル/シェル/静的資産）を削除する */
export async function clearAllCaches(): Promise<void> {
  await clearScenes();
  if (!("caches" in self)) return;
  const keys = await caches.keys();
  await Promise.all(
    keys.filter((k) => k.startsWith(APP_CACHE_PREFIX)).map((k) => caches.delete(k))
  );
}
