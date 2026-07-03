import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // 純ロジックは node、DOM を触るテストは各ファイルで @vitest-environment jsdom を宣言
    environment: "node",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    globals: true,
  },
});
