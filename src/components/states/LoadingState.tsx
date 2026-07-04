import { useAppStore } from "../../store/store";
import { useProcessing } from "../../hooks/useProcessing";
import { useIsMobile } from "../../hooks/useMediaQuery";
import { AmbientBackdrop } from "../viewer/AmbientBackdrop";
import { ProgressRing } from "../feedback/ProgressRing";
import { StageChips } from "../feedback/StageChips";
import { Button } from "../ui/Button";

export function LoadingState() {
  const progress = useAppStore((s) => s.progress);
  const sourceThumbnail = useAppStore((s) => s.sourceThumbnail);
  const { cancel } = useProcessing();
  const isMobile = useIsMobile();

  return (
    <div style={{ position: "relative", height: "100%", overflow: "hidden" }}>
      <AmbientBackdrop src={sourceThumbnail} visible />
      <div
        style={{
          position: "relative",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 22,
          padding: 26,
        }}
      >
        <ProgressRing percent={progress.percent} size={isMobile ? 78 : 84} />
        <div style={{ textAlign: "center" }}>
          <div style={{ font: "600 19px var(--font-jp)", color: "#1d1d1f" }}>深度を推定中</div>
          <div style={{ font: "400 13px var(--font-sans)", color: "#6e6e73", marginTop: 4 }}>
            Estimating depth · Depth Anything V2 Base
          </div>
        </div>
        <StageChips stage={progress.stage} size={isMobile ? "sm" : "md"} />
        <Button variant="glass" onClick={cancel} style={{ height: 40, padding: "0 22px" }}>
          キャンセル Cancel
        </Button>
      </div>
    </div>
  );
}
