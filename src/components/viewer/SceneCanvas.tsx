// Three.js レンダラーをホストする canvas。WebGL 失敗時は CSS フォールバックへ。

import { useRef, useState } from "react";
import { useRenderer } from "../../hooks/useRenderer";
import { useAppStore } from "../../store/store";
import { CssFallbackViewer } from "./CssFallbackViewer";

export function SceneCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);
  const sourceThumbnail = useAppStore((s) => s.sourceThumbnail);

  useRenderer(canvasRef, () => setFailed(true));

  if (failed) return <CssFallbackViewer src={sourceThumbnail} />;

  return (
    <canvas
      ref={canvasRef}
      style={{ width: "100%", height: "100%", display: "block", touchAction: "none" }}
    />
  );
}
