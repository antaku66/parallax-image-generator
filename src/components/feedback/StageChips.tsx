// 処理ステージのチップ列（MD §17 の ProcessingStage に対応）

import type { ProcessingStage } from "../../types";

// 並びは worker の emit 順（preprocessing-image → loading-model → …）に合わせる
const GROUPS: { key: string; label: string; stages: ProcessingStage[] }[] = [
  { key: "preprocess", label: "preprocess", stages: ["preprocessing-image"] },
  { key: "model", label: "model", stages: ["loading-model"] },
  { key: "depth", label: "depth", stages: ["estimating-depth", "normalizing-depth"] },
  {
    key: "mesh",
    label: "mesh",
    stages: ["building-mesh", "finalizing"],
  },
];

function currentGroup(stage: ProcessingStage): number {
  return GROUPS.findIndex((g) => g.stages.includes(stage));
}

export function StageChips({ stage, size = "md" }: { stage: ProcessingStage; size?: "sm" | "md" }) {
  const current = currentGroup(stage);
  const fontSize = size === "sm" ? 10 : 11;
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: size === "sm" ? "6px 10px" : "7px 14px",
        justifyContent: "center",
        maxWidth: 380,
      }}
    >
      {GROUPS.map((g, i) => {
        const done = i < current;
        const active = i === current;
        const color = done ? "#34c759" : active ? "#0a84ff" : "#c7c7cc";
        const mark = done ? "✓" : active ? "◌" : "○";
        return (
          <span key={g.key} style={{ font: `500 ${fontSize}px var(--font-mono)`, color }}>
            {mark} {g.label}
          </span>
        );
      })}
    </div>
  );
}
