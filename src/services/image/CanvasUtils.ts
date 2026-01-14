// Canvas操作ユーティリティ

/** Canvas要素を生成する */
export function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

/** 2Dコンテキストを取得する */
export function getContext2D(
  canvas: HTMLCanvasElement
): CanvasRenderingContext2D {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas 2Dコンテキストの取得に失敗しました");
  }
  return ctx;
}

/** CanvasからImageDataを取得する */
export function canvasToImageData(canvas: HTMLCanvasElement): ImageData {
  const ctx = getContext2D(canvas);
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

/** ImageDataをCanvasに描画する */
export function imageDataToCanvas(imageData: ImageData): HTMLCanvasElement {
  const canvas = createCanvas(imageData.width, imageData.height);
  const ctx = getContext2D(canvas);
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

/** ImageDataからDataURLを生成する */
export function imageDataToDataURL(
  imageData: ImageData,
  type = "image/png"
): string {
  const canvas = imageDataToCanvas(imageData);
  return canvas.toDataURL(type);
}
