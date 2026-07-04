// パフォーマンス表示バッジ（実装ガイド §22）。backend / 推論辺長 / 処理時間を表示する。

import type { SceneMetadata } from "../../types";

export function PerfBadge({ metadata }: { metadata: SceneMetadata }) {
  const parts = [metadata.backend.toUpperCase(), `${metadata.depthSide}px`];
  if (metadata.durationMs != null) parts.push(`${(metadata.durationMs / 1000).toFixed(1)}s`);
  return (
    <div
      // 処理時間は生成時の値（キャッシュ再表示でも保持される）
      title={`深度モデル: ${metadata.model} / 処理時間は生成時の値`}
      style={{
        position: "absolute",
        right: 14,
        top: 14,
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 11px",
        background: "rgba(255,255,255,0.8)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderRadius: 9,
        boxShadow: "0 4px 14px rgba(0,0,0,0.12)",
        zIndex: 4,
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#34c759" }} />
      <span style={{ font: "600 10px var(--font-mono)", color: "#1d1d1f", letterSpacing: "0.04em" }}>
        {parts.join(" · ")}
      </span>
    </div>
  );
}
