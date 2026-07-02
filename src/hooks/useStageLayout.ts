import { useEffect, useState, type RefObject } from "react";
import { computeFrameBox, decideFitMode, type FrameBox } from "../utils/aspect";
import { useAppStore } from "../store/store";

/**
 * ステージのリサイズを監視し、額装写真の寸法（FrameBox）を返す（Studio layout()）。
 * fitMode が未ロックなら画像/ステージのアスペクトから自動判定する。
 */
export function useStageLayout(
  stageRef: RefObject<HTMLElement | null>,
  imageAspect: number | null
): FrameBox | null {
  const fitMode = useAppStore((s) => s.fitMode);
  const fitModeLocked = useAppStore((s) => s.fitModeLocked);
  const setFitMode = useAppStore((s) => s.setFitMode);
  const [box, setBox] = useState<FrameBox | null>(null);

  useEffect(() => {
    const el = stageRef.current;
    if (!el || imageAspect == null || !Number.isFinite(imageAspect)) return;

    const compute = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (!w || !h) return;
      const mode = fitModeLocked ? fitMode : decideFitMode(imageAspect, w / h);
      if (!fitModeLocked && mode !== fitMode) setFitMode(mode, false);
      setBox(computeFrameBox(w, h, imageAspect, mode));
    };

    const ro = new ResizeObserver(compute);
    ro.observe(el);
    compute();
    return () => ro.disconnect();
  }, [stageRef, imageAspect, fitMode, fitModeLocked, setFitMode]);

  return box;
}
