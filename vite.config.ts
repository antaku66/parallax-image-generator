import { defineConfig, normalizePath } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { viteStaticCopy } from "vite-plugin-static-copy";
import path from "node:path";

// SharedArrayBuffer / crossOriginIsolated（マルチスレッド WASM）を有効化するヘッダ。
// dev と preview の両方に付与しないと本番相当の preview でスレッドが無効になる。
const crossOriginIsolationHeaders = {
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "require-corp",
};

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // ONNX Runtime Web の wasm バイナリと .mjs ローダをビルド出力ルートへコピー
    // （wasmPaths が参照。.mjs を含めないと WASM バックエンドが初期化できない）
    viteStaticCopy({
      targets: [
        {
          src: normalizePath(
            path.resolve(
              __dirname,
              "node_modules/onnxruntime-web/dist/ort-wasm-*.{mjs,wasm}"
            )
          ),
          dest: ".",
        },
      ],
    }),
  ],
  // Web Worker は ES モジュール形式（onnxruntime-web の import に必須）
  worker: {
    format: "es",
  },
  // onnxruntime-web の事前バンドルを無効化（動的 wasm ローダを壊さない）
  optimizeDeps: {
    exclude: ["onnxruntime-web"],
  },
  build: {
    target: "esnext",
  },
  server: {
    headers: crossOriginIsolationHeaders,
  },
  preview: {
    headers: crossOriginIsolationHeaders,
  },
});
