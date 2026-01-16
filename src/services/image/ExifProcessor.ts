// EXIF処理ユーティリティ

/** EXIF Orientationの値 */
type ExifOrientation = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

/** ArrayBufferからEXIF Orientationを読み取る */
export function readExifOrientation(
  arrayBuffer: ArrayBuffer
): ExifOrientation | null {
  const view = new DataView(arrayBuffer);

  // JPEGかどうかチェック (SOIマーカー: 0xFFD8)
  if (view.getUint16(0) !== 0xffd8) {
    return null;
  }

  let offset = 2;
  const length = view.byteLength;

  while (offset < length) {
    // マーカーが見つからない場合は終了
    if (view.getUint8(offset) !== 0xff) {
      return null;
    }

    const marker = view.getUint8(offset + 1);

    // APP1マーカー（EXIF）
    if (marker === 0xe1) {
      const exifOffset = offset + 4;

      // "Exif"シグネチャをチェック
      const exifSignature =
        String.fromCharCode(view.getUint8(exifOffset)) +
        String.fromCharCode(view.getUint8(exifOffset + 1)) +
        String.fromCharCode(view.getUint8(exifOffset + 2)) +
        String.fromCharCode(view.getUint8(exifOffset + 3));

      if (exifSignature !== "Exif") {
        return null;
      }

      // TIFFヘッダーの開始位置
      const tiffOffset = exifOffset + 6;

      // エンディアン判定
      const endian = view.getUint16(tiffOffset);
      const littleEndian = endian === 0x4949;

      // IFD0オフセット取得
      const ifd0Offset = view.getUint32(tiffOffset + 4, littleEndian);
      const ifd0Start = tiffOffset + ifd0Offset;

      // IFD0エントリ数
      const numEntries = view.getUint16(ifd0Start, littleEndian);

      // Orientationタグ（0x0112）を探す
      for (let i = 0; i < numEntries; i++) {
        const entryOffset = ifd0Start + 2 + i * 12;
        const tag = view.getUint16(entryOffset, littleEndian);

        if (tag === 0x0112) {
          const orientation = view.getUint16(
            entryOffset + 8,
            littleEndian
          ) as ExifOrientation;
          return orientation >= 1 && orientation <= 8 ? orientation : null;
        }
      }

      return null;
    }

    // 次のマーカーへ
    const segmentLength = view.getUint16(offset + 2);
    offset += 2 + segmentLength;
  }

  return null;
}

/** EXIF Orientationに基づいて画像を回転・反転する */
export function applyExifRotation(
  image: HTMLImageElement,
  orientation: ExifOrientation
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas 2Dコンテキストの取得に失敗しました");
  }

  const { width, height } = image;

  // Orientation 5-8 は幅と高さが入れ替わる
  const swapDimensions = orientation >= 5 && orientation <= 8;
  canvas.width = swapDimensions ? height : width;
  canvas.height = swapDimensions ? width : height;

  // 変換行列を設定
  switch (orientation) {
    case 2: // 水平反転
      ctx.transform(-1, 0, 0, 1, width, 0);
      break;
    case 3: // 180度回転
      ctx.transform(-1, 0, 0, -1, width, height);
      break;
    case 4: // 垂直反転
      ctx.transform(1, 0, 0, -1, 0, height);
      break;
    case 5: // 90度回転 + 水平反転
      ctx.transform(0, 1, 1, 0, 0, 0);
      break;
    case 6: // 90度回転
      ctx.transform(0, 1, -1, 0, height, 0);
      break;
    case 7: // 270度回転 + 水平反転
      ctx.transform(0, -1, -1, 0, height, width);
      break;
    case 8: // 270度回転
      ctx.transform(0, -1, 1, 0, 0, width);
      break;
    default: // 1 または無効な値
      break;
  }

  ctx.drawImage(image, 0, 0);
  return canvas;
}
