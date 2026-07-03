import type { ReactNode } from "react";
import { TopBar } from "./TopBar";
import { Stage } from "./Stage";

type Props = {
  onInfo: () => void;
  onNew: () => void;
  children: ReactNode;
};

export function StudioShell({ onInfo, onNew, children }: Props) {
  return (
    <div
      style={{
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        background: "#f0f0f3",
      }}
    >
      <TopBar onInfo={onInfo} onNew={onNew} />
      <Stage>{children}</Stage>
    </div>
  );
}
