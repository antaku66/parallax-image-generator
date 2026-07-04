// モバイル下部シート（グラバー + Depth/Parallax スライダー）

import { DepthSlider } from "../controls/DepthSlider";
import { ParallaxSlider } from "../controls/ParallaxSlider";

export function MobileSheet() {
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        background: "#fff",
        borderRadius: "24px 24px 0 0",
        boxShadow: "0 -8px 24px rgba(0,0,0,0.1)",
        padding: "12px 18px calc(22px + env(safe-area-inset-bottom))",
        zIndex: 5,
      }}
    >
      <div
        style={{
          width: 38,
          height: 5,
          borderRadius: 3,
          background: "rgba(0,0,0,0.15)",
          margin: "0 auto 14px",
        }}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
        <DepthSlider fullWidth />
        <ParallaxSlider fullWidth />
      </div>
    </div>
  );
}
