// CSS/Canvas フォールバック（MD §20）。深度推論なしで前景を数px動かす簡易視差。

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

// MD §20「ドラッグ量に応じて前景画像を数px移動する」に合わせ一桁 px に抑える
const MAX_SHIFT = 8; // px

export function CssFallbackViewer({ src }: { src: string | null }) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const start = useRef({ x: 0, y: 0 });
  const elRef = useRef<HTMLDivElement>(null);

  const onDown = (e: ReactPointerEvent) => {
    setDragging(true);
    start.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e: ReactPointerEvent) => {
    if (!dragging) return;
    const el = elRef.current;
    const w = el?.clientWidth || 1;
    const h = el?.clientHeight || 1;
    const nx = Math.max(-1, Math.min(1, (e.clientX - start.current.x) / (w * 0.5)));
    const ny = Math.max(-1, Math.min(1, (e.clientY - start.current.y) / (h * 0.5)));
    setOffset({ x: nx * MAX_SHIFT, y: ny * MAX_SHIFT });
  };
  const onUp = () => {
    setDragging(false);
    setOffset({ x: 0, y: 0 });
  };

  return (
    <div
      ref={elRef}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        cursor: dragging ? "grabbing" : "grab",
        touchAction: "none",
        background: "#0a0a0b",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: src ? `url(${src})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
          transform: `scale(1.15) translate(${offset.x * 0.4}px, ${offset.y * 0.4}px)`,
          filter: "blur(20px) brightness(0.9)",
        }}
      />
      <img
        src={src ?? undefined}
        alt=""
        draggable={false}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "contain",
          transform: `translate(${offset.x}px, ${offset.y}px)`,
          transition: dragging ? "none" : "transform 0.35s ease",
        }}
      />
    </div>
  );
}
