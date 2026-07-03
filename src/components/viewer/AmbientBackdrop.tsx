// アンビエント背景（同一画像をぼかして拡大, README / MD §13）

import { AMBIENT } from "../../constants/layout";

type Props = {
  src: string | null;
  visible: boolean;
};

export function AmbientBackdrop({ src, visible }: Props) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.2s ease",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: `scale(${AMBIENT.scale})`,
          filter: `blur(${AMBIENT.blur}px) saturate(${AMBIENT.saturate}) brightness(${AMBIENT.brightness})`,
          backgroundImage: src ? `url(${src})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(120% 100% at 50% 40%, rgba(255,255,255,0) 50%, rgba(20,24,30,0.16) 100%)",
        }}
      />
    </div>
  );
}
