import type { FitMode } from "../../types";

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

function aspectLabel(w: number, h: number): string {
  if (!w || !h) return "";
  const g = gcd(Math.round(w), Math.round(h)) || 1;
  const rw = Math.round(w / g);
  const rh = Math.round(h / g);
  // 比が大きすぎる場合は小数表記に丸める
  if (rw > 40 || rh > 40) return `${(w / h).toFixed(2)}:1`;
  return `${rw}:${rh}`;
}

export function FitBadge({
  fitMode,
  width,
  height,
}: {
  fitMode: FitMode;
  width: number;
  height: number;
}) {
  return (
    <div
      style={{
        position: "absolute",
        left: 14,
        bottom: 14,
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
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#0a84ff" }} />
      <span style={{ font: "600 10px var(--font-mono)", color: "#1d1d1f", letterSpacing: "0.04em" }}>
        {fitMode === "fit" ? "全体 Fit" : "フィル Fill"} · {aspectLabel(width, height)}
      </span>
    </div>
  );
}
