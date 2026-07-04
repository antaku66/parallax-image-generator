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

/** 壊れたエントリの削除に使う（deserialize 失敗時の復旧経路） */
export async function deleteScene(key: SceneCacheKey): Promise<void> {
  const db = await getDB();
  await db.delete(SCENES_STORE, sceneCacheKeyString(key));
}

/** 保存済みシーンを全削除する。clear は versionchange を伴わず Worker 側接続と共存できる */
export async function clearScenes(): Promise<void> {
  const db = await getDB();
  await db.clear(SCENES_STORE);
}
