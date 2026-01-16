// 画像プレビューコンポーネント

import { useMemo } from "react";
import { useAppStore } from "../../store/useAppStore";
import { imageDataToDataURL } from "../../services/image/CanvasUtils";
import { Button } from "../ui/Button";

export function ImagePreview() {
  const { originalImage, reset } = useAppStore();

  const previewUrl = useMemo(() => {
    if (!originalImage) return null;
    return imageDataToDataURL(originalImage.imageData);
  }, [originalImage]);

  if (!originalImage || !previewUrl) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="relative rounded-xl overflow-hidden bg-gray-800">
        <img
          src={previewUrl}
          alt="アップロード画像"
          className="w-full h-auto max-h-[60vh] object-contain"
        />
      </div>

      <div className="flex items-center justify-between text-sm text-gray-400">
        <div className="flex gap-4">
          <span>
            元サイズ: {originalImage.originalWidth} x {originalImage.originalHeight}
          </span>
          <span>
            処理後: {originalImage.processedWidth} x {originalImage.processedHeight}
          </span>
        </div>
        <Button onClick={reset} variant="secondary">
          別の画像を選択
        </Button>
      </div>
    </div>
  );
}
