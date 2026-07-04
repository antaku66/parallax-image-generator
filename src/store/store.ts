import { create } from "zustand";
import { createAssetSlice, type AssetSlice } from "./slices/assetSlice";
import { createProcessSlice, type ProcessSlice } from "./slices/processSlice";
import { createParamsSlice, type ParamsSlice } from "./slices/paramsSlice";
import { createCameraSlice, type CameraSlice } from "./slices/cameraSlice";
import { cancelProcessing } from "../worker/workerClient";

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
  // 実行中ジョブを止めてから破棄する（放置すると Worker 内で最後まで走り続ける）
  if (s.activeJobId) cancelProcessing(s.activeJobId);
  if (s.sourceThumbnail?.startsWith("blob:")) URL.revokeObjectURL(s.sourceThumbnail);
  s.setAsset(null);
  s.setSourceThumbnail(null);
  s.setActiveJobId(null);
  s.setError(null);
  s.setProgress({ stage: "preprocessing-image", percent: 0 });
  s.setFitMode("fit");
  s.setPhase("empty");
}
