import type { StateCreator } from "zustand";
import type { AppStore } from "../store";
import type { CameraState } from "../../types";

export interface CameraSlice {
  camera: CameraState;
  /** Reset ボタン押下などで中心へ戻す要求（レンダラーが監視） */
  recenterToken: number;

  setCamera: (camera: CameraState) => void;
  requestRecenter: () => void;
}

export const createCameraSlice: StateCreator<AppStore, [], [], CameraSlice> = (set) => ({
  camera: { offsetX: 0, offsetY: 0 },
  recenterToken: 0,

  setCamera: (camera) => set({ camera }),
  requestRecenter: () => set((state) => ({ recenterToken: state.recenterToken + 1 })),
});
