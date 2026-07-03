// デバイス種別 → IMAGE_LIMITS キーの解決

import type { ImageLimitTier } from "../../constants/imageLimits";
import { isMobileUA } from "./webgpuDetection";

/** デバイスから画像サイズ階層を決める（モバイルは内部解像度を下げる） */
export function resolveImageTier(): ImageLimitTier {
  return isMobileUA() ? "mobile" : "desktop";
}
