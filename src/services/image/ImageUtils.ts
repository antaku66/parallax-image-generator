// 画像処理ユーティリティ

import { ProcessedImage } from "../../types";
import { APP_CONFIG } from "../../constants/config";
import { createCanvas, getContext2D, canvasToImageData } from "./CanvasUtils";
import { readExifOrientation, applyExifRotation } from "./ExifProcessor";

/** FileからHTMLImageElementを読み込む */
export function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("画像の読み込みに失敗しました"));
    };

    img.src = url;
  });
}

/** 画像を最大サイズにリサイズする */
export function resizeImage(
  source: HTMLCanvasElement | HTMLImageElement,
  maxSize: number
): HTMLCanvasElement {
  const { width, height } = source;

  // リサイズが不要な場合はそのまま返す
  if (width <= maxSize && height <= maxSize) {
    if (source instanceof HTMLCanvasElement) {
      return source;
    }
    const canvas = createCanvas(width, height);
    const ctx = getContext2D(canvas);
    ctx.drawImage(source, 0, 0);
    return canvas;
  }

  // アスペクト比を維持してリサイズ
  const scale = maxSize / Math.max(width, height);
  const newWidth = Math.round(width * scale);
  const newHeight = Math.round(height * scale);

  const canvas = createCanvas(newWidth, newHeight);
  const ctx = getContext2D(canvas);

  // 高品質リサイズ
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, newWidth, newHeight);

  return canvas;
}

/** HTMLImageElementからImageDataを取得する */
export function imageToImageData(image: HTMLImageElement): ImageData {
  const canvas = createCanvas(image.width, image.height);
  const ctx = getContext2D(canvas);
  ctx.drawImage(image, 0, 0);
  return canvasToImageData(canvas);
}

/** 画像ファイルを処理してProcessedImageを生成する */
export async function processImageFile(file: File): Promise<ProcessedImage> {
  // 画像を読み込む
  const image = await loadImageFromFile(file);
  const originalWidth = image.width;
  const originalHeight = image.height;

  // EXIF回転補正を適用
  const arrayBuffer = await file.arrayBuffer();
  const orientation = readExifOrientation(arrayBuffer);
  const rotatedCanvas = orientation
    ? applyExifRotation(image, orientation)
    : null;

  // リサイズ
  const source = rotatedCanvas || image;
  const resizedCanvas = resizeImage(source, APP_CONFIG.MAX_IMAGE_SIZE);

  // ImageDataに変換
  const imageData = canvasToImageData(resizedCanvas);

  return {
    imageData,
    originalWidth,
    originalHeight,
    processedWidth: imageData.width,
    processedHeight: imageData.height,
  };
}

/** サポートされている画像形式 */
type SupportedImageType = (typeof APP_CONFIG.SUPPORTED_IMAGE_TYPES)[number];

/** ファイルのバリデーション */
export function validateImageFile(file: File): string | null {
  // 形式チェック
  const supportedTypes = APP_CONFIG.SUPPORTED_IMAGE_TYPES as readonly string[];
  if (!supportedTypes.includes(file.type)) {
    const typeNames = APP_CONFIG.SUPPORTED_IMAGE_TYPES.map((t: SupportedImageType) =>
      t.replace("image/", "")
    ).join(", ");
    return `対応形式: ${typeNames}`;
  }

  // サイズチェック
  if (file.size > APP_CONFIG.MAX_FILE_SIZE) {
    const maxSizeMB = APP_CONFIG.MAX_FILE_SIZE / (1024 * 1024);
    return `ファイルサイズは${maxSizeMB}MB以下にしてください`;
  }

  return null;
}
