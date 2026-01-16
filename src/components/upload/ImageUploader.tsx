// 画像アップロードコンポーネント

import { useCallback, useRef, useState } from "react";
import { DropZone } from "./DropZone";
import { useAppStore } from "../../store/useAppStore";
import { processImageFile, validateImageFile } from "../../services/image/ImageUtils";
import { Spinner } from "../ui/Spinner";

export function ImageUploader() {
  const { setOriginalImage, setError } = useAppStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      // バリデーション
      const error = validateImageFile(file);
      if (error) {
        setValidationError(error);
        return;
      }

      setValidationError(null);
      setIsProcessing(true);

      try {
        const processedImage = await processImageFile(file);
        setOriginalImage(processedImage);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("画像処理に失敗しました"));
      } finally {
        setIsProcessing(false);
      }
    },
    [setOriginalImage, setError]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFile(file);
      }
      // 同じファイルを再選択できるようにリセット
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    },
    [handleFile]
  );

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  return (
    <DropZone
      onFileDrop={handleFile}
      className="border-2 border-dashed rounded-xl p-8 cursor-pointer hover:border-blue-500"
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />

      <div
        onClick={handleClick}
        className="flex flex-col items-center justify-center min-h-48 text-center"
      >
        {isProcessing ? (
          <div className="flex flex-col items-center gap-4">
            <Spinner size="lg" />
            <p className="text-gray-400">画像を処理中...</p>
          </div>
        ) : (
          <>
            <div className="text-5xl mb-4">
              <svg
                className="w-16 h-16 mx-auto text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <p className="text-lg font-medium text-gray-300">
              画像をドラッグ&ドロップ
            </p>
            <p className="text-sm text-gray-500 mt-2">
              または クリックしてファイルを選択
            </p>
            <p className="text-xs text-gray-600 mt-4">
              対応形式: JPEG, PNG, WebP (最大20MB)
            </p>

            {validationError && (
              <p className="text-sm text-red-400 mt-4">{validationError}</p>
            )}
          </>
        )}
      </div>
    </DropZone>
  );
}
