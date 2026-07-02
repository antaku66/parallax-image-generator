import { useRef } from "react";
import { useAppStore } from "../../store/store";
import { useStageLayout } from "../../hooks/useStageLayout";
import { useIsMobile } from "../../hooks/useMediaQuery";
import { AmbientBackdrop } from "../viewer/AmbientBackdrop";
import { PhotoFrame } from "../viewer/PhotoFrame";
import { SceneCanvas } from "../viewer/SceneCanvas";
import { CssFallbackViewer } from "../viewer/CssFallbackViewer";
import { DragHint } from "../viewer/DragHint";
import { FitBadge } from "../viewer/FitBadge";
import { ControlDock } from "../controls/ControlDock";
import { MobileSheet } from "../mobile/MobileSheet";

export function ViewerState() {
  const asset = useAppStore((s) => s.asset);
  const sourceThumbnail = useAppStore((s) => s.sourceThumbnail);
  const fitMode = useAppStore((s) => s.fitMode);
  const stageRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const imageAspect = asset
    ? asset.source.displayWidth / asset.source.displayHeight
    : null;
  const box = useStageLayout(stageRef, imageAspect);

  const hasScene = Boolean(asset?.layers?.length);

  return (
    <div
      ref={stageRef}
      style={{ position: "relative", height: "100%", overflow: "hidden" }}
    >
      <AmbientBackdrop src={sourceThumbnail} visible={box?.ambient ?? true} />
      {box && (
        <PhotoFrame box={box}>
          {hasScene ? (
            <SceneCanvas />
          ) : (
            <CssFallbackViewer src={sourceThumbnail} />
          )}
          <DragHint key={asset?.source.imageHash ?? "none"} />
        </PhotoFrame>
      )}
      {isMobile ? <MobileSheet /> : <ControlDock />}
      {isMobile && asset && (
        <FitBadge
          fitMode={fitMode}
          width={asset.source.originalWidth}
          height={asset.source.originalHeight}
        />
      )}
    </div>
  );
}
