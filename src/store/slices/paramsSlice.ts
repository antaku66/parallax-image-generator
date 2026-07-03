import type { StateCreator } from "zustand";
import type { AppStore } from "../store";
import type { ParamsState } from "../../types";
import { PIPELINE_DEFAULTS } from "../../constants/pipeline";

export interface ParamsSlice {
  params: ParamsState;
  setParams: (partial: Partial<ParamsState>) => void;
}

export const createParamsSlice: StateCreator<AppStore, [], [], ParamsSlice> = (set) => ({
  params: {
    // Depth スライダーの初期値は Studio デザインの 0.55
    depthScale: 0.55,
    parallaxStrength: 0.6,
    edgeCutThreshold: PIPELINE_DEFAULTS.discontinuityThreshold,
  },
  setParams: (partial) => set((state) => ({ params: { ...state.params, ...partial } })),
});
