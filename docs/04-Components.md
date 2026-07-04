# 主要モジュール

最終更新日: 2026-07-05

## 1. データモデル（`src/types/`）

中心は `SpatialSceneAsset`（実装ガイド §7）。

```ts
type SpatialSceneAsset = {
  version: number;
  source: SourceImageAsset;      // 表示用 ImageBitmap + 寸法 + hash
  depthMap: FloatDepthMap | QuantizedDepthMap; // 0=far/1=near
  layers: SceneLayer[];          // 単層（連続メッシュ）または 背景（インペイント）+ 前景（切抜）
  metadata: SceneMetadata;
};
```

- 保存用 `SerializedSpatialSceneAsset`（`serialized.ts`）は深度を uint8/16 量子化し、レイヤーテクスチャ/表示画像を Blob 化。
- `DepthEstimator`（`depth.ts`）: `load / predict / dispose` + `backend`。
- Worker API: `ProcessingStage` / `ProcessingEvent`（`worker.ts`）、Comlink 公開面の `StartRequest`（`worker/processingApi.ts`）。
- レンダラー（`renderer.ts`）: `SpatialSceneRenderer`（`mount/setAsset/setParameters/setCamera/resize/render/dispose`）。

## 2. Worker（`src/worker/`）

- `processing.worker.ts`: Comlink で `start(req, onEvent)` / `cancel(id)` を公開。ハッシュ算出→キャッシュ確認→前処理→モデル確認→推論→`runPipeline`→serialize/保存→`complete`（キャッシュヒット時は前処理・推論をスキップして早期完了。deserialize に失敗した壊れたエントリは削除して通常処理で再生成）。モデル未配置・推論失敗時は `buildFallbackAsset` を返す。キャンセル・stale イベント時は転送前後の ImageBitmap を close する。
- `workerClient.ts`: main 側 `Comlink.wrap`。`startProcessing(req, onEvent)` は `Comlink.proxy(onEvent)` を渡す。
- `cancellation.ts`: `CancellationRegistry` と `checkpoint()`。

## 3. レンダラー（`src/services/render/`）

- `LayeredRenderer`: `WebGLRenderer`（DPR キャップ）+ `PerspectiveCamera`。先頭レイヤー=不透明・以降=アルファの複数深度メッシュを 1 カメラで描画（最背面の縁のはみ出し防止は buildLayers の外周ガターがメッシュ位置に焼き込み済み）。`setAsset` で旧 geometry/material/texture を `disposeMesh` してから再構築。`dispose` は `renderer.dispose()` のみ（`forceContextLoss()` は呼ばない）。canvas は React 所有・再利用のため、コンテキストを破棄すると StrictMode の再マウントで復帰できず CSS フォールバックに落ちる。
- `DragCameraController`: Pointer Events、`setPointerCapture`、clamp `[-1,1]`、`maxOffset`/`smoothing`、release で中心復帰。カメラは回転させず平行移動のみとし、off-axis projection（非対称視錐台）で z=0 の画像面を画面に固定する（台形歪み・絵全体の泳ぎを防ぐ）。
- `threeResources.ts`: `textureFromBitmap`（sRGB, flipY=false, ミップマップ + 異方性フィルタ）/ `geometryFromSceneMesh`（Uint32 index）/ `disposeMesh`。

## 4. 状態管理（`src/store/`）

`useAppStore` はスライス合成（`design_handoff_spatial_scene/README.md`「State Management」に対応）。

| フィールド | スライス | 主な生産者 | 主な消費者 |
| --- | --- | --- | --- |
| `appState` | process | useProcessing, TopBar(New) | App ルーティング |
| `progress` | process | worker progress | ProgressRing, StageChips |
| `params` | params | DepthSlider, ParallaxSlider | useRenderer.setParameters |
| `recenterToken` | camera | ResetButton | useRenderer.setCamera（中心復帰） |
| `fitMode` | asset | useStageLayout（自動判定） | ViewerState → FitBadge 表示 |
| `asset` / `sourceThumbnail` | asset | worker complete | useRenderer, ViewerState |
| `error` / `activeJobId` | process | worker error / useProcessing | ErrorState |

`resetApp()` は empty へ戻す。

## 5. フック（`src/hooks/`）

- `useProcessing`: `start(file)`（single-flight でキャンセル→jobId 発番→worker 起動）/ `cancel()`。Worker イベントは `id === activeJobId` のみ反映。
- `useRenderer`: canvas に `LayeredRenderer` をマウント、`asset`/`params`/`recenterToken` を橋渡し、アンマウントで `dispose`。ResizeObserver でリサイズ。
- `useStageLayout`: ResizeObserver + `computeFrameBox`（Fit `pad=0.86`/Fill）。`decideFitMode`（許容 `ASPECT_FILL_TOLERANCE`）で Fit/Fill を自動判定する（手動切替は未実装）。※ `Studio Viewer.dc.html` は Fit 固定で描いたモックだが、本実装は README の Fit/Fill 自動判定を採用する。
- `useDropZone`: D&D + ファイル入力 + 形式/サイズ検証（対応形式 **JPEG / PNG / WebP**、最大 **30MB**）。※ handoff（README / Studio Viewer）は「JPEG · PNG · HEIC — 最大 4096px」と掲げるが、HEIC はブラウザの `createImageBitmap` で復号できないため WebP を採用し、上限はファイル容量（30MB）で制限する（辺長制限は `IMAGE_LIMITS[tier].maxInputSide` が前処理時の縮小で担保）。
- `useMediaQuery` / `useIsMobile`: レスポンシブ分岐。

## 6. UI コンポーネント（`src/components/`）

Studio デザイン（`design_handoff_spatial_scene/Studio Viewer.dc.html`）を忠実に再現。

- シェル: `StudioShell`（100dvh 縦）/ `TopBar`（ロゴ・Info・New）/ `Stage`（`#eef1f4`）。
- 状態: `EmptyState`（DropZone）/ `LoadingState`（AmbientBackdrop + ProgressRing + StageChips + Cancel）/ `ViewerState` / `ErrorState`。
- ビューア: `AmbientBackdrop`（同一画像 blur）/ `PhotoFrame`（額装）/ `SceneCanvas`（Three）/ `CssFallbackViewer`（layers 無し時）/ `DragHint`（初回操作ヒント）/ `FitBadge` / `PerfBadge`（backend・推論辺長・処理時間。処理時間は生成時の値でキャッシュ再表示でも保持。フォールバック資産では非表示）。
- コントロール: `ControlDock`（下部・デスクトップ）/ `ParamSlider`（共通見た目。pointerdown を stopPropagation）/ `DepthSlider` / `ParallaxSlider` / `ResetButton`。
- モバイル: `MobileSheet`（下部シート）。
- モーダル: `InfoModal`（アプリ説明 + キャッシュ一括削除。`clearAllCaches` = シーン IndexedDB + `spatial-scene-` プレフィックスの Cache Storage を削除）。

デザイントークンは `index.css` の `@theme`（色 `--color-accent #0a84ff` ほか、フォント Hanken/Schibsted/Zen Kaku/IBM Plex Mono）。
