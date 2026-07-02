import { create } from "zustand";
import { createAssetSlice, type AssetSlice } from "./slices/assetSlice";
import { createProcessSlice, type ProcessSlice } from "./slices/processSlice";
import { createParamsSlice, type ParamsSlice } from "./slices/paramsSlice";
import { createCameraSlice, type CameraSlice } from "./slices/cameraSlice";

export type AppStore = AssetSlice & ProcessSlice & ParamsSlice & CameraSlice;

export const useAppStore = create<AppStore>()((...a) => ({
  ...createAssetSlice(...a),
  ...createProcessSlice(...a),
  ...createParamsSlice(...a),
  ...createCameraSlice(...a),
}));

/** 新規（empty へ戻す）。ビューア/エラーからのリセットに使う。 */
export function resetApp(): void {
  const s = useAppStore.getState();
  s.setAsset(null);
  s.setSourceThumbnail(null);
  s.setActiveJobId(null);
  s.setError(null);
  s.setProgress({ stage: "loading-model", percent: 0 });
  s.setFitMode("fit", false);
  s.setPhase("empty");
}
