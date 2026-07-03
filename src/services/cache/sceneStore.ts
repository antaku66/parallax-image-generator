// シーン資産の永続化ラッパ（MD §18）

import type { SceneCacheKey, SerializedSpatialSceneAsset } from "../../types";
import { getDB, SCENES_STORE } from "./db";
import { sceneCacheKeyString } from "./sceneCacheKey";

export async function getScene(
  key: SceneCacheKey
): Promise<SerializedSpatialSceneAsset | undefined> {
  const db = await getDB();
  return db.get(SCENES_STORE, sceneCacheKeyString(key));
}

export async function hasScene(key: SceneCacheKey): Promise<boolean> {
  const db = await getDB();
  const value = await db.getKey(SCENES_STORE, sceneCacheKeyString(key));
  return value !== undefined;
}

export async function putScene(
  key: SceneCacheKey,
  asset: SerializedSpatialSceneAsset
): Promise<void> {
  const db = await getDB();
  await db.put(SCENES_STORE, asset, sceneCacheKeyString(key));
}
