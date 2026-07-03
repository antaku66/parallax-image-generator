# プロジェクト構造

最終更新日: 2026-07-02

## 1. ディレクトリ構成

```text
parallax/
├── public/
│   ├── models/                     # 深度モデル + manifest.json（*.onnx は未コミット）
│   └── sw.js                       # Service Worker 雛形
├── src/
│   ├── main.tsx                    # エントリ（本番のみ SW 登録）
│   ├── App.tsx                     # appState ルーティング + Studio シェル
│   ├── index.css                   # Tailwind + @theme デザイントークン + フォント/keyframes
│   ├── types/                      # 型のみ
│   │   ├── app.ts / depth.ts / asset.ts / serialized.ts
│   │   ├── worker.ts / renderer.ts / cache.ts / index.ts
│   ├── constants/                  # imageLimits / pipeline / camera / layout / versions / models
│   ├── services/
│   │   ├── image/                  # canvas（OffscreenCanvas）, preprocess（実装ガイド §8）
│   │   ├── hash/                   # imageHash（SHA-256）
│   │   ├── depth/                  # DepthEstimator / OnnxDepthEstimator / resolveOnnxBackend / tensorIO / modelManifest
│   │   ├── pipeline/               # normalizeDepth / percentile / medianDepth / refineDepth / buildDepthMesh / shouldDropTriangle
│   │   │                           #  / splitDepthLayers / pushPullInpaint / maskOps / buildLayers / runPipeline / fallbackAsset
│   │   ├── render/                 # LayeredRenderer / DragCameraController / threeResources / materials/*
│   │   ├── cache/                  # db / sceneCacheKey / serializeAsset / deserializeAsset / sceneStore
│   │   └── device/                 # webgpuDetection / deviceTier
│   ├── worker/                     # processing.worker / processingApi / workerClient / cancellation
│   ├── hooks/                      # useProcessing / useRenderer / useDropZone / useStageLayout / useMediaQuery
│   ├── store/                      # store + slices/{asset,process,params,camera}
│   ├── components/
│   │   ├── shell/                  # StudioShell / TopBar / Stage
│   │   ├── states/                 # EmptyState / LoadingState / ViewerState / ErrorState
│   │   ├── viewer/                 # SceneCanvas / AmbientBackdrop / PhotoFrame / CssFallbackViewer / DragHint / FitBadge
│   │   ├── controls/               # ControlDock / DepthSlider / ResetButton
│   │   ├── mobile/                 # MobileSheet
│   │   ├── upload/                 # DropZone
│   │   ├── feedback/               # ProgressRing / StageChips
│   │   ├── modals/                 # InfoModal
│   │   └── ui/                     # Button
│   └── utils/                      # clamp / quantize / aspect / id / transfer
├── docs/                           # 01-05（本ドキュメント群）
├── design_handoff_spatial_scene/   # UI/UX ハンドオフ（入力）
├── vite.config.ts / vitest.config.ts / tsconfig*.json / eslint.config.js
└── package.json
```

## 2. 依存パッケージ

### 本番

| パッケージ | 役割 |
| --- | --- |
| react / react-dom (19) | UI |
| three | 3D 描画（生 Three.js） |
| onnxruntime-web (1.23 系) | ONNX 推論（WebGPU/WASM） |
| comlink | Worker 通信 |
| zustand | 状態管理 |
| idb | IndexedDB Promise API |

### 開発

`vite`, `@vitejs/plugin-react`, `typescript`, `typescript-eslint`, `eslint`(+plugins), `@tailwindcss/vite` / `tailwindcss`, `@types/three`, `@types/react`(-dom), `@webgpu/types`, `vite-plugin-static-copy`, `vitest`, `jsdom`, `prettier`。

## 3. ビルド設定の要点（vite.config.ts）

- `worker.format: "es"` — Worker 内の ESM import（onnxruntime-web）に必須。
- `optimizeDeps.exclude: ["onnxruntime-web"]` — 動的 wasm ローダを壊さない。
- `viteStaticCopy` — `onnxruntime-web/dist/ort-wasm-*.{mjs,wasm}`（wasm バイナリと .mjs ローダ）を出力ルートへコピー（`wasmPaths` が参照。`.mjs` を含めないと WASM バックエンドが初期化できない）。
- `server.headers` / `preview.headers` に COOP `same-origin` + COEP `require-corp` — `crossOriginIsolated`（マルチスレッド WASM）を有効化。**未設定でも単一スレッドで動作**する設計。
