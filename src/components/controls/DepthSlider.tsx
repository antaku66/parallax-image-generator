import { useAppStore } from "../../store/store";
import { ParamSlider } from "./ParamSlider";

export function DepthSlider({ fullWidth = false }: { fullWidth?: boolean }) {
  const depthScale = useAppStore((s) => s.params.depthScale);
  const setParams = useAppStore((s) => s.setParams);
  return (
    <ParamSlider
      label="立体感 Depth"
      value={depthScale}
      onChange={(v) => setParams({ depthScale: v })}
      fullWidth={fullWidth}
    />
  );
}
