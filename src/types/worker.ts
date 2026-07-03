// Worker API の型（実装ガイド §20）

import type { ParamsState, ProcessingStage } from "./app";
import type { SpatialSceneAsset } from "./asset";

export type { ProcessingStage };

export type ProcessingRequest =
  | {
      type: "start";
      id: string;
      file: File;
      params?: Partial<ParamsState>;
    }
  | { type: "cancel"; id: string };

export type ProcessingEvent =
  | { type: "progress"; id: string; stage: ProcessingStage; progress: number }
  | { type: "complete"; id: string; asset: SpatialSceneAsset }
  | {
      type: "error";
      id: string;
      message: string;
      /** 推論失敗でも CSS フォールバック資産があれば degraded 表示 */
      fallbackAsset?: SpatialSceneAsset;
    };

/** Worker のイベントコールバック */
export type ProcessingEventHandler = (event: ProcessingEvent) => void;
