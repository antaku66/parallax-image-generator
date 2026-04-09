# 実装計画

最終更新日: 2026-01-20

## 1. 実装フェーズ

### Phase 1: プロジェクト基盤 ✅

- Vite + React + TypeScript初期化
- TailwindCSS v4セットアップ
- ESLint設定
- 基本ディレクトリ構造
- 共通UIコンポーネント（Button, Slider, Modal, Spinner）

### Phase 2: 画像アップロード ✅

- ImageUploaderコンポーネント
- DropZone（ドラッグ&ドロップ）
- ImagePreview（プレビュー表示）
- 画像リサイズ・正規化ユーティリティ（ImageUtils, CanvasUtils, ExifProcessor）
- Zustand store基盤（useAppStore）

### Phase 3: セグメンテーション

MobileSAMを使用したインスタンスセグメンテーション。

詳細は [06-Segmentation-Detail.md](./06-Segmentation-Detail.md) を参照。

**サブフェーズ**:

| # | サブフェーズ | 内容 |
| --- | --- | --- |
| 3.1 | 基盤インフラストラクチャ | ONNX Runtime Web環境構築、型定義 |
| 3.2 | モデル管理システム | IndexedDBキャッシュ、進捗付きダウンロード |
| 3.3 | MobileSAM Encoder統合 | 画像埋め込み生成、Web Worker |
| 3.4 | MobileSAM Decoder統合 | マスク生成、後処理 |
| 3.5 | AutoMaskGenerator | グリッドポイント、NMS、バッチ推論 |
| 3.6 | インスタンスマージと背景分離 | 重複統合、背景判定 |
| 3.7 | UI統合 | プレビュー、進捗UI、状態管理 |
| 3.8 | パフォーマンス最適化 | 品質モード、Transferable Objects |

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

| ファイルパス                             | 責務                             | 実装状態 |
| ---------------------------------------- | -------------------------------- | -------- |
| src/store/useAppStore.ts                 | グローバル状態管理               | ✅       |
| src/components/upload/ImageUploader.tsx  | 画像アップロードUI               | ✅       |
| src/components/upload/DropZone.tsx       | ドラッグ&ドロップ                | ✅       |
| src/components/upload/ImagePreview.tsx   | アップロード画像プレビュー       | ✅       |
| src/services/image/ImageUtils.ts         | 画像処理（リサイズ等）           | ✅       |
| src/services/image/CanvasUtils.ts        | Canvas操作ユーティリティ         | ✅       |
| src/services/image/ExifProcessor.ts      | EXIF回転補正                     | ✅       |
| src/services/pipeline/PipelineManager.ts | パイプラインオーケストレーション | -        |
| src/workers/inpainting.worker.ts         | LaMa推論（最重量処理）           | -        |
| src/workers/segmentation.worker.ts       | MobileSAMセグメンテーション      | -        |
| src/workers/depth.worker.ts              | MiDaS深度推定                    | -        |
| src/components/viewer/ThreeScene.tsx     | 視差レンダリング                 | -        |
| src/services/models/ModelManager.ts      | モデル管理・キャッシュ           | -        |
| src/hooks/useImageProcessor.ts           | 画像処理フック                   | -        |
| src/utils/deviceDetection.ts             | デバイス性能検出                 | -        |

---

## 3. ブラウザ互換性

| 機能       | Chrome | Firefox | Safari | Edge |
| ---------- | ------ | ------- | ------ | ---- |
| WebGPU     | 113+   | 実験的  | TP     | 113+ |
| WASM       | 57+    | 52+     | 11+    | 16+  |
| Web Worker | 4+     | 3.5+    | 4+     | 12+  |
| IndexedDB  | 23+    | 10+     | 10+    | 12+  |

**推奨ブラウザ**: Chrome 113以降（WebGPU対応）

**フォールバック**: WebGPU非対応時はWASMで動作（処理速度低下）
