import type { StateCreator } from "zustand";
import type { AppStore } from "../store";
import type { FitMode, SpatialSceneAsset } from "../../types";

export interface AssetSlice {
  asset: SpatialSceneAsset | null;
  /** 読込中/ビューアのアンビエント背景に使う元画像の dataURL */
  sourceThumbnail: string | null;
  fitMode: FitMode;
  /** ユーザーが Fit/Fill を手動固定した場合 true（自動判定を止める） */
  fitModeLocked: boolean;

  setAsset: (asset: SpatialSceneAsset | null) => void;
  setSourceThumbnail: (url: string | null) => void;
  setFitMode: (mode: FitMode, locked?: boolean) => void;
}

export const createAssetSlice: StateCreator<AppStore, [], [], AssetSlice> = (set) => ({
  asset: null,
  sourceThumbnail: null,
  fitMode: "fit",
  fitModeLocked: false,

  setAsset: (asset) => set({ asset }),
  setSourceThumbnail: (sourceThumbnail) => set({ sourceThumbnail }),
  setFitMode: (fitMode, locked = true) => set({ fitMode, fitModeLocked: locked }),
});
