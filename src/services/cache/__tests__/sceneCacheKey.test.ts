import { describe, it, expect } from "vitest";
import { buildSceneCacheKey, sceneCacheKeyString } from "../sceneCacheKey";
import { MODELS } from "../../../constants/models";
import { PROCESSING_VERSION } from "../../../constants/versions";

describe("SceneCacheKey", () => {
  it("画像ハッシュ・モデル情報からキーを生成する", () => {
    const key = buildSceneCacheKey("abc123", "depth-anything-v2-base");
    expect(key.imageHash).toBe("abc123");
    expect(key.modelName).toBe("depth-anything-v2-base");
    expect(key.modelVersion).toBe(MODELS["depth-anything-v2-base"].version);
    expect(key.processingVersion).toBe(PROCESSING_VERSION);
  });

  it("安定した文字列へ直列化する", () => {
    const key = buildSceneCacheKey("abc123", "depth-anything-v2-base");
    const str = sceneCacheKeyString(key);
    expect(str.startsWith("abc123|depth-anything-v2-base|")).toBe(true);
    expect(str.split("|")).toHaveLength(4);
  });
});
