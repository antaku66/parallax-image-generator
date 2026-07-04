# 実装計画・受け入れ条件

最終更新日: 2026-07-05

## 1. 実装計画（実装ガイド §24）

複数 PR に分割して進める。「状態」は本リポジトリでの実装状況。

| PR | 内容 | 状態 |
| --- | --- | --- |
| PR1 | Vite/React/TypeScript、画像アップロード、画像正規化、型定義 | 実装済み |
| PR2 | DepthEstimator interface、ONNX Runtime Web、backend 判定 | 実装済み |
| PR3 | depth 正規化、depth refinement、2.5D メッシュ生成 | 実装済み |
| PR4 | segmentation interface、segmentation 推論、mask 生成 | 今後（guided filter によるマット精錬 + 色デコンタミネーションで「深度のみマット」の実用上限を確認してから、人物クローズアップ等に限定して導入判断） |
| PR5 | depth histogram によるレイヤー分割、Layered Depth Image 生成 | 一部（Otsu 分割 + 分離度 η による 2 層/単層の自動切替。多層分割は今後） |
| PR6 | edge dilation、OpenCV.js inpaint、fallback backdrop | 一部（push-pull による背景インペイント + 前景マスク膨張 + 外周ガター。OpenCV.js inpaint は**見送り**: 平滑充填で push-pull と画質差が小さく wasm 約 8MB の依存が重いため、必要なら穴周辺の高周波統計に基づく粒状合成で代替する） |
| PR7 | LayeredRenderer、DragCameraController、Three.js リソース管理 | 実装済み |
| PR8 | Worker 分離、進捗イベント、キャンセル対応、Transferable 対応 | 実装済み |
| PR9 | IndexedDB キャッシュ、Cache Storage、Service Worker | 実装済み（IndexedDB + モデル Cache Storage + SW〔シェル SWR / 静的資産・ORT wasm cache-first〕+ キャッシュ一括削除） |
| PR10 | パラメータ UI、エラー表示、パフォーマンス表示 | 実装済み（Depth/Parallax スライダー、Reset、エラー UI、パフォーマンスバッジ。layer count・mask feather・inpainting 有無・backdrop blur の Worker パラメータ化は再処理とキャッシュキー設計を要するため見送り） |
| PR11 | テスト、サンプル画像での回帰確認、README 整備 | 一部（純ロジックのユニットテスト + README） |

segmentation・多層分割は独立した処理として後から追加できる構成にしてある（追加しても既存の描画・キャッシュ経路は変わらない。`LayeredRenderer` は任意レイヤー数に対応済み）。パイプラインの処理内容を変えた場合（`PIPELINE_DEFAULTS` / `IMAGE_LIMITS` の値変更を含む）は `constants/versions.ts` の `PROCESSING_VERSION` を上げてキャッシュを無効化する。キャッシュキーには tier（mobile/desktop）も含まれ、tier 依存の解像度差で別品質の資産を誤ヒットしない。

## 2. 深度モデルの入手・配置

1. [Hugging Face `onnx-community/depth-anything-v2-base`](https://huggingface.co/onnx-community/depth-anything-v2-base) の量子化 ONNX（`onnx/model_quantized.onnx`, 約97MB）を取得。
2. `public/models/depth-anything-v2-base.onnx` として配置（`public/models/manifest.json` と整合）。
3. モデルバイナリは `.gitignore` によりコミットしない。

より高精細な描画が必要で GPU が十分に強力なら、[`onnx-community/depth-anything-v2-large`](https://huggingface.co/onnx-community/depth-anything-v2-large) を `public/models/depth-anything-v2-large.onnx` に配置し、`constants/models.ts` の `DEFAULT_MODEL` を `depth-anything-v2-large` に変更する。Large はダウンロード量（約320MB）とメモリ・処理時間が大きいため、端末性能に応じて選ぶ。

**モデル未配置でも動作**する: 処理開始時（Worker）に HEAD で存在確認し、無ければ CSS/Canvas フォールバックへ自動で落ちる（実装ガイド §23）。

## 3. 受け入れ条件（実装ガイド §25）

- サーバーなしで動作する。
- 画像アップロードから空間シーン風表示まで完結する。
- モバイルでも動作する（`deviceTier` で内部解像度調整・DPR キャップ）。
- ドラッグで視点が動く（ジャイロ不使用）。
- 推論や重い処理で UI が固まらない（Worker 分離）。
- 推論失敗/モデル未配置時に CSS/Canvas フォールバックへ落ちる。
- 同じ画像をキャッシュから再表示できる（IndexedDB）。
- キャンセルで処理結果の反映を止められる（jobId 破棄）。
- 画像差し替え時に古い Three.js リソースが破棄される（`dispose`）。

## 4. テスト（Vitest）

`npm test`。主な対象（実装ガイド §25）:

- `normalizeDepth`（ゼロ除算・0=far/1=near の向き）
- `medianDepth` / `refineDepth`（深度後処理）
- `splitDepthLayers` / `maskOps` / `pushPullInpaint`（レイヤー生成コア）
- `buildDepthMesh` / `shouldDropTriangle`（メッシュ生成）
- `SceneCacheKey` 生成・直列化
- `serialize / deserialize`（深度量子化・layer mesh の数値往復）

`serialize/deserialize` の画像経路は `ImageBitmap`/`OffscreenCanvas` を要するため、DOM 依存部分はモックしつつ数値往復を検証する。

## 5. 検証手順

1. `npm install`
2. `npm run lint` / `npm run build`（`tsc -b` 込み）がエラーなし
3. `npm test` が green
4. `npm run dev`: アップロード→（モデル配置時）深度推定→空間シーン表示、ドラッグ/Depth/Reset、キャンセル、同一画像の即時再表示。モデル未配置時に CSS/Canvas フォールバックを確認。
5. `npm run build && npm run preview`: 本番経路（Worker バンドル・wasm コピー・`crossOriginIsolated`）を確認。
6. Service Worker（本番のみ登録）: DevTools → Application で activated を確認し、Cache Storage に `spatial-scene-shell-v1`（`/`）とリロード後の `spatial-scene-static-v1`（`/assets/*`, ort-wasm）が入ること、キャッシュ応答でも `crossOriginIsolated === true` を確認。情報モーダルの「キャッシュを削除」で `spatial-scene-*` と IndexedDB `scenes` が空になり、同一画像が再処理になることを確認。
7. モバイル幅で下部シート UI と操作性を確認。
