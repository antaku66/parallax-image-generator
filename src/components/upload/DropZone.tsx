// ドラッグ&ドロップの招待エリア（読込前）

import type { ChangeEvent, DragEventHandler, RefObject } from "react";
import { Button } from "../ui/Button";

type Props = {
  isOver: boolean;
  error: string | null;
  inputRef: RefObject<HTMLInputElement | null>;
  openFileDialog: () => void;
  onInputChange: (e: ChangeEvent<HTMLInputElement>) => void;
  dropHandlers: {
    onDrop: DragEventHandler;
    onDragOver: DragEventHandler;
    onDragLeave: DragEventHandler;
  };
};

export function DropZone({
  isOver,
  error,
  inputRef,
  openFileDialog,
  onInputChange,
  dropHandlers,
}: Props) {
  return (
    <div
      {...dropHandlers}
      style={{
        position: "relative",
        flex: 1,
        border: `1.6px dashed rgba(10,132,255,${isOver ? 0.65 : 0.38})`,
        borderRadius: 20,
        background: "linear-gradient(180deg, rgba(255,255,255,0.7), rgba(255,255,255,0.35))",
        backdropFilter: "blur(2px)",
        WebkitBackdropFilter: "blur(2px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        textAlign: "center",
        padding: 24,
        transition: "border-color 0.15s ease",
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={onInputChange}
        style={{ display: "none" }}
      />
      <div
        style={{
          width: 66,
          height: 66,
          borderRadius: "50%",
          background: "rgba(10,132,255,0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 28,
          color: "#0a84ff",
        }}
      >
        ↑
      </div>
      <div>
        <div style={{ font: "600 20px var(--font-jp)", color: "#1d1d1f" }}>画像をドロップ</div>
        <div style={{ font: "400 13.5px var(--font-sans)", color: "#86868b", marginTop: 4 }}>
          Drag &amp; drop an image, or
        </div>
      </div>
      <Button variant="primary" style={{ height: 42, padding: "0 24px", borderRadius: 13 }} onClick={openFileDialog}>
        ファイルを選択 Choose file
      </Button>
      <div style={{ font: "400 11px var(--font-mono)", color: "#c7c7cc" }}>
        JPEG · PNG · WebP — 最大 30MB
      </div>
      {error && (
        <div style={{ font: "500 12px var(--font-sans)", color: "#ff9f0a" }}>{error}</div>
      )}
    </div>
  );
}
