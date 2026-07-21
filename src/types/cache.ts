// キャッシュキーの型（実装ガイド §21）

/** 同一画像・同一モデル・同一処理バージョン・同一 tier なら再生成しない（実装ガイド §21） */
export type SceneCacheKey = {
  imageHash: string;
  modelName: string;
  modelVersion: string;
  processingVersion: string;
  /** 解像度階層（mobile/desktop）。tier 依存の解像度が資産に焼き込まれるためキーに含める */
  tier: string;
  /** seg モデルのバージョン（未配置は "none"）。配置/撤去だけで該当資産を再生成する */
  segVersion: string;
};
