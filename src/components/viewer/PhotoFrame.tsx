// 額装写真フレーム（useStageLayout の FrameBox で寸法決定）

import type { ReactNode } from "react";
import type { FrameBox } from "../../utils/aspect";

export function PhotoFrame({ box, children }: { box: FrameBox; children: ReactNode }) {
  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        transform: "translate(-50%,-50%)",
        width: Math.round(box.width),
        height: Math.round(box.height),
        borderRadius: box.radius,
        overflow: "hidden",
        boxShadow: box.ambient
          ? "0 4px 14px rgba(0,0,0,0.10), 0 30px 60px -24px rgba(0,0,0,0.45)"
          : "none",
      }}
    >
      {children}
    </div>
  );
}
