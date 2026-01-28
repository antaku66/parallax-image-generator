import { defineConfig, normalizePath } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { viteStaticCopy } from "vite-plugin-static-copy";
import path from "node:path";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // ONNX Runtime Web の WASM ファイルをビルド出力にコピー
    viteStaticCopy({
      targets: [
        {
          src: normalizePath(
            path.resolve(
              __dirname,
              "node_modules/onnxruntime-web/dist/*.wasm"
            )
          ),
          dest: ".",
        },
      ],
    }),
  ],
  // Web Worker 設定
  worker: {
    format: "es",
  },
  // onnxruntime-web の事前バンドルを無効化
  optimizeDeps: {
    exclude: ["onnxruntime-web"],
  },
  build: {
    target: "esnext",
  },
  // SharedArrayBuffer 有効化（マルチスレッド WASM 用）
  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
});
