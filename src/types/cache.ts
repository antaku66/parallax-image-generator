// キャッシュキーとモデルマニフェストの型（実装ガイド §6, §21）

import type { ModelName } from "./depth";

/** 同一画像・同一モデル・同一処理バージョンなら再生成しない（実装ガイド §21） */
export type SceneCacheKey = {
  imageHash: string;
  modelName: string;
  modelVersion: string;
  processingVersion: string;
};

export type ModelManifestEntry = {
  id: ModelName;
  url: string;
  sizeBytes: number;
  /** 推論入力辺（14 の倍数） */
  inputSide: number;
  version: string;
};

export type ModelManifest = {
  models: ModelManifestEntry[];
};
