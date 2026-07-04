// レンダラーのインターフェース（実装ガイド §18, §19）

import type { CameraState, ParamsState } from "./app";
import type { SpatialSceneAsset } from "./asset";

/** setParameters で受け取る調整値。UI の ParamsState と同形。 */
export type RendererParameters = ParamsState;

export type { CameraState };

export interface SpatialSceneRenderer {
  mount(canvas: HTMLCanvasElement): void;
  setAsset(asset: SpatialSceneAsset): Promise<void>;
  setParameters(params: RendererParameters): void;
  /** UI からのカメラ目標更新（Reset の中心復帰などで使用） */
  setCamera(camera: CameraState): void;
  resize(width: number, height: number): void;
  render(): void;
  dispose(): void;
}
