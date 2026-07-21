import { describe, it, expect } from "vitest";
import { buildSceneCacheKey, sceneCacheKeyString } from "../sceneCacheKey";
import { MODELS } from "../../../constants/models";
import { PROCESSING_VERSION } from "../../../constants/versions";

describe("SceneCacheKey", () => {
  it("画像ハッシュ・モデル情報・tier からキーを生成する", () => {
    const key = buildSceneCacheKey("abc123", "depth-anything-v2-base", "desktop");
    expect(key.imageHash).toBe("abc123");
    expect(key.modelName).toBe("depth-anything-v2-base");
    expect(key.modelVersion).toBe(MODELS["depth-anything-v2-base"].version);
    expect(key.processingVersion).toBe(PROCESSING_VERSION);
    expect(key.tier).toBe("desktop");
    expect(key.segVersion).toBe("none");
  });

  it("安定した文字列へ直列化する", () => {
    const key = buildSceneCacheKey("abc123", "depth-anything-v2-base", "desktop");
    const str = sceneCacheKeyString(key);
    expect(str.startsWith("abc123|depth-anything-v2-base|")).toBe(true);
    expect(str.split("|")).toHaveLength(6);
  });

  it("seg モデルの配置有無でキー文字列が異なる（配置/撤去だけで再生成される）", () => {
    const without = sceneCacheKeyString(
      buildSceneCacheKey("abc123", "depth-anything-v2-base", "desktop")
    );
    const withSeg = sceneCacheKeyString(
      buildSceneCacheKey("abc123", "depth-anything-v2-base", "desktop", "modnet")
    );
    expect(without).not.toBe(withSeg);
  });

  it("tier が異なればキー文字列も異なる（別 tier の資産を誤ヒットさせない）", () => {
    const desktop = sceneCacheKeyString(buildSceneCacheKey("abc123", "depth-anything-v2-base", "desktop"));
    const mobile = sceneCacheKeyString(buildSceneCacheKey("abc123", "depth-anything-v2-base", "mobile"));
    expect(desktop).not.toBe(mobile);
  });
});
