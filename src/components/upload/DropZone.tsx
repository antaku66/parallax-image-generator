// ドラッグ&ドロップエリアコンポーネント

import { useState, useCallback } from "react";

interface DropZoneProps {
  onFileDrop: (file: File) => void;
  children: React.ReactNode;
  className?: string;
}

export function DropZone({ onFileDrop, children, className = "" }: DropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // 子要素へのドラッグ移動を無視
    if (e.currentTarget.contains(e.relatedTarget as Node)) {
      return;
    }
    setIsDragOver(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        onFileDrop(file);
      }
    },
    [onFileDrop]
  );

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`
        transition-all duration-200
        ${isDragOver ? "border-blue-500 bg-blue-500/10" : "border-gray-600"}
        ${className}
      `}
    >
      {children}
    </div>
  );
}
