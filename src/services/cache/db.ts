// IndexedDB スキーマ（MD §18）

import { openDB, type IDBPDatabase } from "idb";
import type { SerializedSpatialSceneAsset } from "../../types";

const DB_NAME = "spatial-scene";
const DB_VERSION = 1;

export const SCENES_STORE = "scenes";

export interface SpatialSceneDB {
  [SCENES_STORE]: {
    key: string;
    value: SerializedSpatialSceneAsset;
  };
}

let dbPromise: Promise<IDBPDatabase<SpatialSceneDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<SpatialSceneDB>> {
  if (!dbPromise) {
    dbPromise = openDB<SpatialSceneDB>(DB_NAME, DB_VERSION, {
      // 過去の v1 で作成した未使用の settings ストアが残る環境があるが、
      // 空のまま無害なので version バンプによる削除はしない
      upgrade(db) {
        if (!db.objectStoreNames.contains(SCENES_STORE)) {
          db.createObjectStore(SCENES_STORE);
        }
      },
    });
  }
  return dbPromise;
}
