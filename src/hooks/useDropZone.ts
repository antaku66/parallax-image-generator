import { useCallback, useRef, useState } from "react";
import type { DragEvent as ReactDragEvent } from "react";
import { MAX_FILE_SIZE, SUPPORTED_IMAGE_TYPES } from "../constants/imageLimits";

function validate(file: File): string | null {
  const types = SUPPORTED_IMAGE_TYPES as readonly string[];
  if (!types.includes(file.type)) {
    return "対応形式は JPEG · PNG · WebP です";
  }
  if (file.size > MAX_FILE_SIZE) {
    return `ファイルサイズは ${Math.round(MAX_FILE_SIZE / (1024 * 1024))}MB 以下にしてください`;
  }
  return null;
}

export function useDropZone(onFile: (file: File) => void) {
  const [isOver, setIsOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File | undefined | null) => {
      if (!file) return;
      const err = validate(file);
      if (err) {
        setError(err);
        return;
      }
      setError(null);
      onFile(file);
    },
    [onFile]
  );

  const onDrop = useCallback(
    (e: ReactDragEvent) => {
      e.preventDefault();
      setIsOver(false);
      handleFile(e.dataTransfer.files?.[0]);
    },
    [handleFile]
  );

  const onDragOver = useCallback((e: ReactDragEvent) => {
    e.preventDefault();
    setIsOver(true);
  }, []);

  const onDragLeave = useCallback((e: ReactDragEvent) => {
    e.preventDefault();
    setIsOver(false);
  }, []);

  const openFileDialog = useCallback(() => inputRef.current?.click(), []);

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFile(e.target.files?.[0]);
      e.target.value = "";
    },
    [handleFile]
  );

  return {
    isOver,
    error,
    inputRef,
    openFileDialog,
    onInputChange,
    dropHandlers: { onDrop, onDragOver, onDragLeave },
  };
}
