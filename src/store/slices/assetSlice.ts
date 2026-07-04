import type { StateCreator } from "zustand";
import type { AppStore } from "../store";
import type { FitMode, SpatialSceneAsset } from "../../types";
import { closeAssetBitmaps } from "../../utils/closeAsset";

export interface AssetSlice {
  asset: SpatialSceneAsset | null;
  /** 読込中/ビューアのアンビエント背景に使う元画像の object URL */
  sourceThumbnail: string | null;
  fitMode: FitMode;

  setAsset: (asset: SpatialSceneAsset | null) => void;
  setSourceThumbnail: (url: string | null) => void;
  setFitMode: (mode: FitMode) => void;
}

export const createAssetSlice: StateCreator<AppStore, [], [], AssetSlice> = (set, get) => ({
  asset: null,
  sourceThumbnail: null,
  fitMode: "fit",

  setAsset: (asset) => {
    // 差し替え/リセットで参照が切れる旧資産のビットマップを解放する（GPU 側は renderer が dispose）
    const prev = get().asset;
    if (prev && prev !== asset) closeAssetBitmaps(prev);
    set({ asset });
  },
  setSourceThumbnail: (sourceThumbnail) => set({ sourceThumbnail }),
  setFitMode: (fitMode) => set({ fitMode }),
});
