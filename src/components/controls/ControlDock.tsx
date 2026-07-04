// デスクトップ下部コントロールドック（ガラス調）

import { DepthSlider } from "./DepthSlider";
import { ParallaxSlider } from "./ParallaxSlider";
import { ResetButton } from "./ResetButton";

export function ControlDock() {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 18,
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        alignItems: "center",
        gap: 20,
        padding: "14px 18px",
        background: "rgba(255,255,255,0.78)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderRadius: 20,
        boxShadow: "0 1px 1px rgba(0,0,0,0.04), 0 12px 36px rgba(0,0,0,0.16)",
        zIndex: 5,
      }}
    >
      <DepthSlider />
      <ParallaxSlider />
      <div style={{ width: 1, height: 40, background: "rgba(0,0,0,0.08)" }} />
      <ResetButton />
    </div>
  );
}
