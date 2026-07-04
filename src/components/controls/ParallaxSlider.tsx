import { useAppStore } from "../../store/store";
import { ParamSlider } from "./ParamSlider";

export function ParallaxSlider({ fullWidth = false }: { fullWidth?: boolean }) {
  const parallaxStrength = useAppStore((s) => s.params.parallaxStrength);
  const setParams = useAppStore((s) => s.setParams);
  return (
    <ParamSlider
      label="視差 Parallax"
      value={parallaxStrength}
      onChange={(v) => setParams({ parallaxStrength: v })}
      fullWidth={fullWidth}
    />
  );
}
