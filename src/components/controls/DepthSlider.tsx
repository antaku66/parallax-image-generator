import type { PointerEvent as ReactPointerEvent } from "react";
import { useAppStore } from "../../store/store";

export function DepthSlider({ fullWidth = false }: { fullWidth?: boolean }) {
  const depthScale = useAppStore((s) => s.params.depthScale);
  const setParams = useAppStore((s) => s.setParams);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        width: fullWidth ? "100%" : 228,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ font: "600 11px var(--font-sans)", color: "#6e6e73" }}>立体感 Depth</span>
        <span style={{ font: "500 11px var(--font-mono)", color: "#1d1d1f" }}>
          {depthScale.toFixed(2)}
        </span>
      </div>
      <input
        className="studio-range"
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={depthScale}
        onChange={(e) => setParams({ depthScale: Number(e.target.value) })}
        // スライダー操作をステージのドラッグへ伝播させない
        onPointerDown={(e: ReactPointerEvent) => e.stopPropagation()}
      />
    </div>
  );
}
