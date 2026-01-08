# 実装計画

最終更新日: 2026-01-07

## 1. 実装フェーズ

### Phase 1: プロジェクト基盤

- Vite + React + TypeScript初期化
- TailwindCSS v4セットアップ
- ESLint設定
- 基本ディレクトリ構造
- 共通UIコンポーネント（Button, Slider, Modal）

### Phase 2: 画像アップロード

- ImageUploaderコンポーネント
- DropZone（ドラッグ&ドロップ）
- 画像リサイズ・正規化ユーティリティ
- Zustand store基盤

### Phase 3: セグメンテーション

- MediaPipe tasks-vision統合
- segmentation.worker.ts実装
- Comlink設定
- マスクプレビュー表示

### Phase 4: 深度推定

- ONNX Runtime Web設定
- MiDaSモデル統合
- depth.worker.ts実装
- 深度マップ可視化

### Phase 5: インペインティング

- LaMa ONNXモデル統合
- inpainting.worker.ts実装
- WebGPU/WASMフォールバック
- IndexedDBキャッシュ
- 量子化モデル対応

### Phase 6: 視差ビューア

- Three.js / React Three Fiber設定
- ThreeSceneコンポーネント
- Displacement Mapシェーダー
- マウス/タッチ追従ロジック
- 視差強度調整UI

### Phase 7: 統合・最適化

- パイプライン全体統合
- エラーハンドリング強化
- ローディングUX改善
- レスポンシブ調整
- パフォーマンスチューニング

### Phase 8: ドキュメント

- 各ドキュメントの整備
- README.md更新

---

## 2. 重要ファイル一覧

| ファイルパス | 責務 |
| --- | --- |
| src/services/pipeline/PipelineManager.ts | パイプラインオーケストレーション |
| src/workers/inpainting.worker.ts | LaMa推論（最重量処理） |
| src/workers/segmentation.worker.ts | MediaPipeセグメンテーション |
| src/workers/depth.worker.ts | MiDaS深度推定 |
| src/components/viewer/ThreeScene.tsx | 視差レンダリング |
| src/services/models/ModelManager.ts | モデル管理・キャッシュ |
| src/store/useAppStore.ts | グローバル状態管理 |
| src/hooks/useImageProcessor.ts | 画像処理フック |
| src/utils/deviceDetection.ts | デバイス性能検出 |

---

## 3. ブラウザ互換性

| 機能 | Chrome | Firefox | Safari | Edge |
| --- | --- | --- | --- | --- |
| WebGPU | 113+ | 実験的 | TP | 113+ |
| WASM | 57+ | 52+ | 11+ | 16+ |
| Web Worker | 4+ | 3.5+ | 4+ | 12+ |
| IndexedDB | 23+ | 10+ | 10+ | 12+ |

**推奨ブラウザ**: Chrome 113以降（WebGPU対応）

**フォールバック**: WebGPU非対応時はWASMで動作（処理速度低下）
