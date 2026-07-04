// パラメータスライダーの共通見た目（ラベル + 値表示 + range）

import type { PointerEvent as ReactPointerEvent } from "react";

type Props = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  fullWidth?: boolean;
};

export function ParamSlider({ label, value, onChange, fullWidth = false }: Props) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        width: fullWidth ? "100%" : 190,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ font: "600 11px var(--font-sans)", color: "#6e6e73" }}>{label}</span>
        <span style={{ font: "500 11px var(--font-mono)", color: "#1d1d1f" }}>
          {value.toFixed(2)}
        </span>
      </div>
      <input
        className="studio-range"
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        // スライダー操作をステージのドラッグへ伝播させない
        onPointerDown={(e: ReactPointerEvent) => e.stopPropagation()}
      />
    </div>
  );
}
