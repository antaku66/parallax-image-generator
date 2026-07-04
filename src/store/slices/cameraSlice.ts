import type { StateCreator } from "zustand";
import type { AppStore } from "../store";

export interface CameraSlice {
  /** Reset ボタン押下などで中心へ戻す要求（レンダラーが監視） */
  recenterToken: number;

  requestRecenter: () => void;
}

export const createCameraSlice: StateCreator<AppStore, [], [], CameraSlice> = (set) => ({
  recenterToken: 0,

  requestRecenter: () => set((state) => ({ recenterToken: state.recenterToken + 1 })),
});
