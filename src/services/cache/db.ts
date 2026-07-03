// IndexedDB スキーマ（MD §18）

import { openDB, type IDBPDatabase } from "idb";
import type { SerializedSpatialSceneAsset } from "../../types";

const DB_NAME = "spatial-scene";
const DB_VERSION = 1;

export const SCENES_STORE = "scenes";
export const SETTINGS_STORE = "settings";

export interface SpatialSceneDB {
  [SCENES_STORE]: {
    key: string;
    value: SerializedSpatialSceneAsset;
  };
  [SETTINGS_STORE]: {
    key: string;
    value: unknown;
  };
}

let dbPromise: Promise<IDBPDatabase<SpatialSceneDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<SpatialSceneDB>> {
  if (!dbPromise) {
    dbPromise = openDB<SpatialSceneDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(SCENES_STORE)) {
          db.createObjectStore(SCENES_STORE);
        }
        if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
          db.createObjectStore(SETTINGS_STORE);
        }
      },
    });
  }
  return dbPromise;
}
