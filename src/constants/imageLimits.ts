// 画像サイズ制限（実装ガイド §8）
// 端末性能に応じて内部解像度・分割数だけを変える（機能構成は共通）。

// depthSide: 推論長辺（アスペクト比保持・両辺 14 の倍数へスナップ）。ViT patch=14 の倍数にする。
// meshGrid: 2.5D メッシュの格子分割数（tier 別）。深度エッジに沿ってシルエットを追える解像度。
// maxLayers: レイヤー分割の上限。層ごとにテクスチャと push-pull が増えるため
// メモリ・処理時間の観点で抑える（実装ガイド §13 の 6 は過大）。
export const IMAGE_LIMITS = {
  mobile: { maxInputSide: 1600, depthSide: 392, textureSide: 1024, meshGrid: 128, maxLayers: 3 },
  desktop: { maxInputSide: 2400, depthSide: 686, textureSide: 1600, meshGrid: 256, maxLayers: 4 },
} as const;

export type ImageLimitTier = keyof typeof IMAGE_LIMITS;

export const SUPPORTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

/** 最大ファイルサイズ（30MB） */
export const MAX_FILE_SIZE = 30 * 1024 * 1024;
