import { useProcessing } from "../../hooks/useProcessing";
import { useDropZone } from "../../hooks/useDropZone";
import { useIsMobile } from "../../hooks/useMediaQuery";
import { DropZone } from "../upload/DropZone";

export function EmptyState() {
  const { start } = useProcessing();
  const dz = useDropZone(start);
  const isMobile = useIsMobile();

  return (
    <div
      style={{
        position: "relative",
        height: "100%",
        padding: isMobile ? 20 : 30,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(120% 90% at 50% 30%, rgba(10,132,255,0.05), rgba(10,132,255,0) 55%), radial-gradient(120% 80% at 50% 110%, rgba(94,92,230,0.06), rgba(94,92,230,0) 60%)",
        }}
      />
      <DropZone {...dz} />
    </div>
  );
}
