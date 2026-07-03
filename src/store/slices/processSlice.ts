import type { StateCreator } from "zustand";
import type { AppStore } from "../store";
import type { AppPhase, ProgressState } from "../../types";

export interface ProcessSlice {
  appState: AppPhase;
  progress: ProgressState;
  activeJobId: string | null;
  error: string | null;

  setPhase: (phase: AppPhase) => void;
  setProgress: (progress: ProgressState) => void;
  setActiveJobId: (id: string | null) => void;
  setError: (message: string | null) => void;
}

export const createProcessSlice: StateCreator<AppStore, [], [], ProcessSlice> = (set) => ({
  appState: "empty",
  progress: { stage: "loading-model", percent: 0 },
  activeJobId: null,
  error: null,

  setPhase: (appState) => set({ appState }),
  setProgress: (progress) => set({ progress }),
  setActiveJobId: (activeJobId) => set({ activeJobId }),
  setError: (error) => set({ error }),
});
