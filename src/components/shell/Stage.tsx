import type { ReactNode } from "react";

export function Stage({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        position: "relative",
        flex: 1,
        minHeight: 0,
        overflow: "hidden",
        background: "#eef1f4",
      }}
    >
      {children}
    </div>
  );
}
