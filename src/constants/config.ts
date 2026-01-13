// アプリケーション設定定数
export const APP_CONFIG = {
  // 画像処理の最大サイズ
  MAX_IMAGE_SIZE: 1024,
  // 対応画像形式
  SUPPORTED_IMAGE_TYPES: ["image/jpeg", "image/png", "image/webp"],
  // 最大ファイルサイズ（20MB）
  MAX_FILE_SIZE: 20 * 1024 * 1024,
} as const;
