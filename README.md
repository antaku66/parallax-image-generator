# Spatial · 空間シーン

1枚の画像から擬似的な空間シーンを生成し、ブラウザ上でドラッグして視点移動できる Web アプリ。サーバー不要・クライアント完結。

- 深度推定: Depth Anything V2（ONNX Runtime Web, WebGPU→WASM フォールバック）
- 描画: 生 Three.js / WebGL2 による前景/背景レイヤーメッシュ + ドラッグ視点移動（ジャイロ不使用）
- 重い処理は Web Worker（Comlink）に分離。モデル未配置/推論失敗時は CSS/Canvas の簡易視差へ自動フォールバック。

## セットアップ

```bash
npm install
npm run dev        # 開発サーバー
npm run build      # tsc -b && vite build
npm run preview    # 本番相当プレビュー（COOP/COEP 付き）
npm test           # Vitest
```

## 深度モデルの配置（任意）

モデル未配置でも CSS/Canvas フォールバックで動作するが、本来の空間シーン表示には深度モデルが必要:

1. [`onnx-community/depth-anything-v2-base`](https://huggingface.co/onnx-community/depth-anything-v2-base) の量子化 ONNX（`onnx/model_quantized.onnx`, 約97MB）を取得。
2. `public/models/depth-anything-v2-base.onnx` として配置する。

より高精細に描画したい場合は `depth-anything-v2-large`（約320MB）を配置し、`src/constants/models.ts` の `DEFAULT_MODEL` を切り替える（GPU 性能に応じて選択）。モデルバイナリはリポジトリにコミットしない（`.gitignore` 済み）。

## ドキュメント

- [docs/01-Overview.md](docs/01-Overview.md) — 目的・技術スタック・アーキテクチャ
- [docs/02-Project-Structure.md](docs/02-Project-Structure.md) — ディレクトリ・依存・ビルド設定
- [docs/03-Pipeline.md](docs/03-Pipeline.md) — パイプライン・データフロー・フォールバック
- [docs/04-Components.md](docs/04-Components.md) — 型・レンダラー・Worker・状態・UI
- [docs/05-Implementation.md](docs/05-Implementation.md) — フェーズ計画・モデル入手・受け入れ条件

UI/UX の元となるデザインハンドオフは `design_handoff_spatial_scene/` にある。
