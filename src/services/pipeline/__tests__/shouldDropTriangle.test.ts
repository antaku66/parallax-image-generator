import { describe, it, expect } from "vitest";
import { shouldDropTriangle } from "../shouldDropTriangle";

describe("shouldDropTriangle", () => {
  it("深度差がしきい値以内なら破棄しない", () => {
    expect(shouldDropTriangle(0.1, 0.12, 0.15, 0.18)).toBe(false);
  });
  it("深度差がしきい値を超えたら破棄する", () => {
    expect(shouldDropTriangle(0.1, 0.2, 0.5, 0.18)).toBe(true);
  });
});
