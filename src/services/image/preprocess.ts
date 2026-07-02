// 画像前処理（MD §8）。Worker 内で動作する（DOM 非依存）。

import { IMAGE_LIMITS, type ImageLimitTier } from "../../constants/imageLimits";

export type PreprocessResult = {
  /** 推論用（depthSide に収めた）画像 */
  inference: ImageBitmap;
  /** 表示テクスチャ用（textureSide に収めた）画像 */
  display: ImageBitmap;
  originalWidth: number;
  originalHeight: number;
  displayWidth: number;
  displayHeight: number;
  mime: string;
};

/** EXIF orientation を反映してデコード（MD §8）。非対応時は無補正でフォールバック。 */
async function decodeOriented(blob: Blob): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(blob, { imageOrientation: "from-image" });
  } catch {
    return createImageBitmap(blob);
  }
}

/** 最大辺を maxSide に収めた新しい ImageBitmap を必ず生成する */
async function fitBitmap(src: ImageBitmap, maxSide: number): Promise<ImageBitmap> {
  const scale = Math.min(1, maxSide / Math.max(src.width, src.height));
  const w = Math.max(1, Math.round(src.width * scale));
  const h = Math.max(1, Math.round(src.height * scale));
  return createImageBitmap(src, {
    resizeWidth: w,
    resizeHeight: h,
    resizeQuality: scale < 1 ? "high" : "medium",
  });
}

export async function preprocessImage(
  file: Blob,
  tier: ImageLimitTier,
  mime: string
): Promise<PreprocessResult> {
  const limits = IMAGE_LIMITS[tier];
  const oriented = await decodeOriented(file);
  const originalWidth = oriented.width;
  const originalHeight = oriented.height;

  // 入力上限に収めた作業用ビットマップ
  const base = await fitBitmap(oriented, limits.maxInputSide);
  oriented.close();

  const display = await fitBitmap(base, limits.textureSide);
  const inference = await fitBitmap(base, limits.depthSide);
  base.close();

  return {
    inference,
    display,
    originalWidth,
    originalHeight,
    displayWidth: display.width,
    displayHeight: display.height,
    mime: mime || "image/jpeg",
  };
}
