// OffscreenCanvas ベースの画像ヘルパ（Worker/Main どちらでも動作）

export function createOffscreen(width: number, height: number): OffscreenCanvas {
  return new OffscreenCanvas(Math.max(1, width), Math.max(1, height));
}

export function get2d(canvas: OffscreenCanvas): OffscreenCanvasRenderingContext2D {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("OffscreenCanvas 2D コンテキストの取得に失敗しました");
  return ctx;
}

/** ImageBitmap を指定サイズに描画して ImageData を得る */
export function bitmapToImageData(
  bitmap: ImageBitmap,
  width: number,
  height: number
): ImageData {
  const canvas = createOffscreen(width, height);
  const ctx = get2d(canvas);
  ctx.drawImage(bitmap, 0, 0, width, height);
  return ctx.getImageData(0, 0, width, height);
}

/** ImageData を Rec.601 輝度の Float32Array（[0,1]）へ変換（guided filter のガイド用） */
export function luminanceFromImageData(img: ImageData): Float32Array {
  const { data } = img;
  const out = new Float32Array(img.width * img.height);
  for (let i = 0; i < out.length; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    out[i] = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  }
  return out;
}

/** ImageBitmap を encoded Blob 化（保存用） */
export async function encodeBitmap(
  bitmap: ImageBitmap,
  type = "image/webp",
  quality = 0.9
): Promise<Blob> {
  const canvas = createOffscreen(bitmap.width, bitmap.height);
  get2d(canvas).drawImage(bitmap, 0, 0);
  return canvas.convertToBlob({ type, quality });
}
