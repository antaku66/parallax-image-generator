# Spatial Scene Web App Implementation Guide

## 1. 目的

1枚の画像から疑似的な空間シーンを生成し、ブラウザ上でドラッグ操作により視点移動できるWebアプリを開発する。

AppleのiOS空間シーン機能そのものは使わず、OSSとブラウザ標準技術でクライアントサイド完結の類似体験を実装する。

## 2. 前提条件

- Webアプリとして開発する。
- サーバーは作らない。
- 画像処理、深度推定、メッシュ生成、レイヤー生成、描画はすべてクライアント側で行う。
- ジャイロは使わず、視点操作はドラッグで行う。
- WebGPUを優先し、利用できない環境ではWASMへフォールバックする。
- 推論、メッシュ生成、レイヤー生成、保存処理中もUIをブロックしない。
- 端末性能に応じて内部解像度や分割数は調整するが、機能構成は一本化する。
- 推論や補完処理が部分的に失敗しても、可能な範囲で空間シーン表示を継続する。

## 3. 推奨スタック

```text
Language: TypeScript
Build: Vite
UI: React
Rendering: Three.js / WebGL2
Inference: ONNX Runtime Web
Worker: Web Worker + Comlink
Image Processing: Canvas / OffscreenCanvas
Optional Image Processing: OpenCV.js
Storage: IndexedDB + Cache Storage + Service Worker
Testing: Vitest
Formatting: ESLint + Prettier
```

## 4. 全体構成

```text
画像入力
  ↓
画像正規化
  ↓
深度推定
  ↓
depth正規化
  ↓
depth refinement
  ↓
segmentation
  ↓
depth histogramによるlayer分割
  ↓
Layered Depth Image生成
  ↓
edge dilation / inpainting
  ↓
multi-layer renderer
  ↓
ドラッグ操作による視点移動
```

主要コンポーネント:

```text
SpatialSceneProcessor
├─ ImagePreprocessor
├─ DepthEstimator
├─ DepthRefiner
├─ SegmentationEstimator
├─ LayerBuilder
├─ HoleCompletionProcessor
└─ SpatialSceneSerializer

SpatialSceneRenderer
├─ LayeredRenderer
├─ FallbackBackdropRenderer
└─ DragCameraController
```

## 5. 設計原則

- 最終出力は `SpatialSceneAsset` に統一する。
- ランタイム用 `SpatialSceneAsset` と保存用 `SerializedSpatialSceneAsset` は分ける。
- depth値の規約は `0.0 = far`, `1.0 = near` に統一する。
- 重い処理はWeb Workerへ分離する。
- WorkerからTypedArrayを返す場合はTransferableを使う。
- ONNX backendは実際のsession作成で検証し、失敗時はWASMへフォールバックする。
- WebGPUを使えない環境では内部解像度と処理負荷を下げる。
- segmentation、inpainting、レイヤー補正は独立した処理として扱い、失敗しても処理全体を失敗扱いにしない。
- Three.jsの `Texture`、`Geometry`、`Material` は差し替え時と破棄時に必ず `dispose()` する。
- 画像差し替え、キャンセル、エラー復旧で古い処理結果をUIへ反映しない。

## 6. モデル配置

モデルは `public/models/` 配下に配置する。

```text
public/
└─ models/
   ├─ depth-anything-v2-base.onnx
   ├─ depth-anything-v2-large.onnx
   ├─ segmentation.onnx
   └─ manifest.json
```

`manifest.json` はモデルID、URL、サイズ、入力サイズ、バージョン、推奨backend、必要メモリ目安を持つ。初回ロード時は進捗を表示し、取得済みモデルはCache Storageへ保存する。

```ts
export type ModelManifest = {
  models: Array<{
    id: string;
    url: string;
    sizeBytes: number;
    inputSize: number;
    version: string;
    preferredBackend: "webgpu" | "wasm";
    estimatedMemoryMB: number;
  }>;
};
```

## 7. データ構造

### SpatialSceneAsset

```ts
export type SpatialSceneAsset = {
  version: number;
  source: SourceImageAsset;
  depthMap: QuantizedDepthMap | FloatDepthMap;
  refinedDepthMap?: QuantizedDepthMap | FloatDepthMap;
  segmentation?: SegmentationMap;
  layers: SceneLayer[];
  fallbackBackdrop: FallbackBackdropAsset;
  metadata: SceneMetadata;
};
```

### 保存形式

IndexedDBへ保存する形式はランタイム形式と分ける。

```ts
export type SerializedSpatialSceneAsset = {
  version: number;
  source: SerializedSourceImageAsset;
  depthMap: SerializedDepthMap;
  refinedDepthMap?: SerializedDepthMap;
  segmentation?: SerializedSegmentationMap;
  layers: SerializedSceneLayer[];
  fallbackBackdrop: SerializedFallbackBackdropAsset;
  metadata: SceneMetadata;
};
```

保存時のdepthは原則 `uint8` または `uint16` に量子化する。`Float32Array` は容量が大きいため、必要な場合だけ保持する。

### SceneLayer

```ts
export type SceneLayer = {
  id: string;
  depthRange: { near: number; far: number };
  mask: LayerMask;
  texture: TextureAsset;
  dilatedTexture?: TextureAsset;
  inpaintedTexture?: TextureAsset;
  mesh: SceneMesh;
  parallaxScale: number;
  renderOrder: number;
};
```

### SceneMetadata

```ts
export type SceneMetadata = {
  imageHash: string;
  modelName: string;
  modelVersion: string;
  segmentationModelName?: string;
  segmentationModelVersion?: string;
  processingVersion: string;
  backend: "webgpu" | "wasm";
  inputSize: { width: number; height: number };
  depthSize: { width: number; height: number };
  layerCount: number;
  createdAt: string;
};
```

## 8. 画像前処理

画像アップロード後、以下を行う。

```text
1. Fileを受け取る
2. createImageBitmapで読み込む
3. EXIF orientationを可能な範囲で補正する
4. CanvasまたはOffscreenCanvasへ描画する
5. sRGB前提で処理する
6. 入力画像サイズを制限する
7. 推論用画像と表示用画像を分ける
8. 画像ハッシュを計算する
```

`createImageBitmap(file, { imageOrientation: "from-image" })` を優先し、非対応時は通常描画へフォールバックする。

```ts
export const IMAGE_LIMITS = {
  mobile: { maxInputSide: 2400, depthSide: 768, textureSide: 1600 },
  desktop: { maxInputSide: 4096, depthSide: 1536, textureSide: 2048 },
} as const;
```

端末性能が低い場合は `depthSide` と `textureSide` を下げる。機能を分岐させるのではなく、同じパイプラインの内部パラメータとして調整する。

## 9. 深度推定

```ts
export interface DepthEstimator {
  load(options: DepthEstimatorLoadOptions): Promise<void>;
  predict(input: ImageBitmap | ImageData): Promise<FloatDepthMap>;
  dispose(): void;
}

export type DepthEstimatorLoadOptions = {
  model: "depth-anything-v2-base" | "depth-anything-v2-large";
  backend: "auto" | "webgpu" | "wasm";
};
```

backend選択は `navigator.gpu` の有無だけで確定しない。実際の `InferenceSession` 作成で検証し、失敗したらWASMへ落とす。

```ts
export async function resolveOnnxBackend(
  createSession: (backend: "webgpu" | "wasm") => Promise<void>,
): Promise<"webgpu" | "wasm"> {
  if ("gpu" in navigator) {
    try {
      await createSession("webgpu");
      return "webgpu";
    } catch {
      // continue to wasm
    }
  }

  await createSession("wasm");
  return "wasm";
}
```

## 10. depth正規化

depthは絶対距離ではなく相対値として扱う。規約は `0.0 = far`, `1.0 = near`。

min/max正規化ではなくpercentile正規化を使う。ゼロ除算を避けるため、rangeには下限値を持たせる。

```ts
export function normalizeDepth(depth: FloatDepthMap): FloatDepthMap {
  const data = depth.data;
  const p02 = percentile(data, 0.02);
  const p98 = percentile(data, 0.98);
  const range = Math.max(p98 - p02, 1e-6);
  const out = new Float32Array(data.length);

  for (let i = 0; i < data.length; i++) {
    out[i] = clamp((data[i] - p02) / range, 0, 1);
  }

  return { kind: "float32", width: depth.width, height: depth.height, data: out };
}
```

## 11. depth refinement

深度推定結果に対して、レイヤー分割とメッシュ生成に適した補正を行う。

```text
1. percentile normalize
2. bilateral smoothing
3. edge-aware smoothing
4. 小さな孤立領域の補正
5. 入力画像エッジとの整合性調整
6. depth discontinuityの強調
```

```ts
export interface DepthRefiner {
  refine(options: DepthRefineOptions): Promise<FloatDepthMap>;
}

export type DepthRefineOptions = {
  image: ImageData;
  depth: FloatDepthMap;
  edgePreserveStrength: number;
  smoothingRadius: number;
  discontinuityBoost: number;
};
```

過剰な平滑化は視差の破綻につながるため、画像エッジとdepth差の両方を見て補正する。

## 12. segmentation

人物、主要物体、背景の境界を安定させるためにsegmentationを行う。

```ts
export interface SegmentationEstimator {
  load(options: SegmentationLoadOptions): Promise<void>;
  predict(input: ImageBitmap | ImageData): Promise<SegmentationMap>;
  dispose(): void;
}

export type SegmentationMap = {
  width: number;
  height: number;
  labels: Uint8Array;
  confidence?: Float32Array;
};
```

segmentationはレイヤー境界の補助情報として使う。信頼度が低い領域ではdepth histogramと画像エッジを優先する。

## 13. レイヤー生成

単一メッシュだけで前景と背景をつなぐと、視点移動時に破綻しやすい。depth histogram、segmentation、画像エッジを組み合わせて複数レイヤーへ分割する。

```text
1. refined depthからdepth histogramを作る
2. depth分布の谷を候補境界にする
3. segmentation境界と画像エッジで候補境界を補正する
4. 近景、中景、遠景のレイヤーを生成する
5. 各レイヤーにmaskを割り当てる
6. maskをmorphologyで整える
7. レイヤーごとにメッシュを生成する
8. レイヤー間の描画順とparallaxScaleを決める
```

```ts
export interface LayerBuilder {
  build(options: BuildLayerOptions): Promise<SceneLayer[]>;
}

export type BuildLayerOptions = {
  image: ImageData;
  depth: FloatDepthMap;
  segmentation?: SegmentationMap;
  minLayerCount: number;
  maxLayerCount: number;
  minRegionAreaRatio: number;
};
```

初期値:

```ts
export const LAYER_DEFAULTS = {
  minLayerCount: 3,
  maxLayerCount: 6,
  minRegionAreaRatio: 0.01,
  maskFeatherRadius: 2,
  depthScale: 0.08,
  discontinuityThreshold: 0.14,
};
```

## 14. Layered Depth Image

各レイヤーはmask、texture、depth、meshを持つ。視点移動時はレイヤーごとに異なるparallaxを適用する。

```text
Layer 0: far background
Layer 1: mid background
Layer 2: main subject / foreground
Layer N: nearest foreground details
```

実装上は `renderOrder` と `depthRange` で描画順を制御する。半透明境界はalpha fringeが出やすいため、mask featherとedge dilationを組み合わせる。

## 15. edge dilation / inpainting

視点移動時に前景の背後が露出するため、各レイヤーの欠損領域を補完する。

```text
1. レイヤーmaskの境界を検出する
2. 背景側へedge dilationを行う
3. 欠損が大きい領域はOpenCV.js inpaintを試す
4. 失敗時はblur + scaleしたfallback backdropを使う
5. 補完結果をレイヤーtextureへ反映する
```

```ts
export interface HoleCompletionProcessor {
  complete(options: HoleCompletionOptions): Promise<CompletedLayerTexture>;
}

export type HoleCompletionOptions = {
  image: ImageData;
  layer: SceneLayer;
  method: "edge-dilation" | "inpaint" | "auto";
  maxInpaintAreaRatio: number;
};
```

inpaintingは処理時間とメモリ消費が大きいため、欠損面積がしきい値を超える場合はedge dilationとfallback backdropで処理する。

## 16. メッシュ生成

```ts
export function buildDepthMesh(options: BuildDepthMeshOptions): SceneMesh {
  // 1. gridX x gridY の頂点を作る
  // 2. uvを割り当てる
  // 3. depthをz座標へ反映する
  // 4. mask外の頂点または三角形を除外する
  // 5. 三角形indexを作る
  // 6. depth差が大きい三角形を破棄する
  // 7. SceneMeshを返す
}
```

前景と背景を1枚の三角形でつながないため、depth差が大きい三角形は破棄する。

```ts
function shouldDropTriangle(d0: number, d1: number, d2: number, threshold: number): boolean {
  return Math.max(d0, d1, d2) - Math.min(d0, d1, d2) > threshold;
}
```

初期値:

```ts
export const MESH_DEFAULTS = {
  gridX: 128,
  gridY: 128,
  depthScale: 0.08,
  discontinuityThreshold: 0.14,
};
```

## 17. fallback backdrop

深度推定、レイヤー補完、inpaintingの不完全さを隠すため、背面に補助背景を置く。

```text
1. 元画像を少し拡大する
2. 強めにblurする
3. 背面planeとして配置する
4. レイヤー間の隙間や穴を目立ちにくくする
```

```ts
export const BACKDROP_DEFAULTS = {
  blur: 24,
  scale: 1.08,
  opacity: 1,
};
```

## 18. レンダリング

```text
SpatialSceneRenderer
├─ LayeredRenderer
│  ├─ multiple depth-aware layers
│  ├─ per-layer parallax
│  ├─ mask feathering
│  └─ renderOrder control
├─ FallbackBackdropRenderer
└─ DragCameraController
```

```ts
export interface SpatialSceneRenderer {
  mount(canvas: HTMLCanvasElement): void;
  setAsset(asset: SpatialSceneAsset): Promise<void>;
  setParameters(params: RendererParameters): void;
  resize(width: number, height: number): void;
  render(): void;
  dispose(): void;
}
```

画像差し替え時は古いThree.jsリソースを破棄する。

## 19. ドラッグ操作

Pointer Eventsで統一する。

```text
pointerdown: ドラッグ開始
pointermove: 移動量をcamera offsetへ変換
pointerup / pointercancel: ドラッグ終了
release後: 中心へイージングで戻す
```

カメラ移動量は必ずclampする。

```ts
export const CAMERA_DEFAULTS = {
  maxOffset: 0.08,
  smoothing: 0.1,
  returnToCenterSmoothing: 0.08,
};
```

## 20. Worker API

重い処理はWorkerで行う。

Main Thread:

```text
UI / Canvas / Renderer / Pointer Events / Progress display
```

Worker:

```text
Image preprocessing / Model loading / Depth inference / Depth refinement / Segmentation / Layer generation / Hole completion / Cache serialization
```

```ts
export type ProcessingStage =
  | "loading-model"
  | "preprocessing-image"
  | "estimating-depth"
  | "normalizing-depth"
  | "refining-depth"
  | "estimating-segmentation"
  | "building-layers"
  | "completing-layer-textures"
  | "building-meshes"
  | "building-fallback"
  | "serializing-cache"
  | "finalizing";

export type ProcessingRequest =
  | { type: "start"; id: string; file: File; options?: ProcessingOptions }
  | { type: "cancel"; id: string };

export type ProcessingEvent =
  | { type: "progress"; id: string; stage: ProcessingStage; progress: number }
  | { type: "complete"; id: string; asset: SpatialSceneAsset }
  | { type: "error"; id: string; message: string; fallbackAsset?: SpatialSceneAsset };
```

ONNX推論自体を完全に中断できない場合でも、後続処理と結果反映は止める。

## 21. キャッシュ

### Cache Storage

```text
- ONNX Runtime wasm files
- model files
- app assets
- static JS/CSS bundles
```

### IndexedDB

```text
- SerializedSpatialSceneAsset
- quantized depth maps
- segmentation maps
- completed layer textures
- thumbnails
- user settings
```

```ts
export type SceneCacheKey = {
  imageHash: string;
  modelName: string;
  modelVersion: string;
  segmentationModelName?: string;
  segmentationModelVersion?: string;
  processingVersion: string;
  backend: "webgpu" | "wasm";
};
```

同じ画像、同じモデル、同じ処理バージョンなら再生成しない。backend差で結果が変わる可能性があるため、backendもキーに含める。

## 22. UI要件

必須要素:

```text
- 画像アップロード
- 処理進捗
- キャンセルボタン
- Canvasビューア
- パラメータ調整
- エラー表示
- キャッシュ削除
- パフォーマンス表示
```

調整可能にする主なパラメータ:

```text
- parallax strength
- max camera offset
- depth scale
- layer count
- mask feather radius
- inpainting使用有無
- backdrop blur
```

## 23. フォールバック

```text
WebGPU backend
  ↓ 失敗
WASM backend
  ↓ 失敗
CSS/Canvas fallback
```

CSS/Canvas fallback:

```text
- depth推論が完全に失敗した場合に使う
- 元画像を前面に表示する
- blur + scaleした背景画像を背面に表示する
- ドラッグ量に応じて前景画像を数px移動する
```

部分失敗時の扱い:

```text
segmentation失敗: depth histogramと画像エッジでレイヤー分割する
inpainting失敗: edge dilationとfallback backdropを使う
レイヤー生成失敗: depth meshとfallback backdropで表示する
キャッシュ保存失敗: 表示は継続し、再生成可能な状態にする
```

## 24. 実装計画

複数PRに分割する。

| PR | 内容 |
|---|---|
| PR1 | Vite/React/TypeScript、画像アップロード、画像正規化、型定義 |
| PR2 | DepthEstimator interface、ONNX Runtime Web、backend判定、depth map可視化 |
| PR3 | depth正規化、depth refinement、2.5Dメッシュ生成 |
| PR4 | segmentation interface、segmentation推論、mask生成 |
| PR5 | depth histogramによるレイヤー分割、Layered Depth Image生成 |
| PR6 | edge dilation、OpenCV.js inpaint、fallback backdrop |
| PR7 | LayeredRenderer、DragCameraController、Three.jsリソース管理 |
| PR8 | Worker分離、進捗イベント、キャンセル対応、Transferable対応 |
| PR9 | IndexedDBキャッシュ、Cache Storage、Service Worker |
| PR10 | パラメータUI、エラー表示、パフォーマンス表示 |
| PR11 | テスト、サンプル画像での回帰確認、README整備 |

## 25. 受け入れ条件

必須:

- サーバーなしで動作する。
- 画像アップロードから空間シーン風表示まで完結する。
- ドラッグで視点が動く。
- ジャイロを使っていない。
- 推論や重い処理でUIが固まらない。
- WebGPUが使えない環境でもWASMで処理を試行する。
- 推論失敗時にCSS/Canvas fallbackへ落ちる。
- segmentationやinpaintingの失敗で処理全体が停止しない。
- 同じ画像をキャッシュから再表示できる。
- キャンセルボタンで処理結果の反映を止められる。
- 画像差し替え時に古いThree.jsリソースが破棄される。

品質:

- 人物写真で前景と背景の視差が分かる。
- 建物、室内、風景でも奥行きの破綻が目立ちにくい。
- 前景と背景が不自然な三角形で接続されない。
- レイヤー境界の穴、にじみ、alpha fringeが目立ちにくい。
- 視点移動量が大きすぎず、破綻が目立ちにくい。
- モバイルでも操作中に大きなフリーズが発生しない。

テスト:

- `normalizeDepth`
- `refineDepth`
- `buildDepthHistogram`
- `buildLayers`
- `buildDepthMesh`
- `shouldDropTriangle`
- `completeLayerTexture`
- `SceneCacheKey`生成
- `serialize / deserialize`
- Worker cancel handling
- Three.js resource disposal

## 26. Claude Codeへの実装指示

PR単位で実装する。初期PRから必ず守ること:

1. `SpatialSceneAsset` を中心に設計する。
2. `SpatialSceneAsset` と `SerializedSpatialSceneAsset` を分ける。
3. depth規約は `0.0 = far`, `1.0 = near` に統一する。
4. `DepthEstimator` interface経由でモデルを使う。
5. レンダリングは `LayeredRenderer` を中心に構成する。
6. 重い処理はWorkerに分離する。
7. Worker APIにはキャンセルを含める。
8. TypedArray転送にはTransferableを使う。
9. WebGPU backendはsession作成失敗時にWASMへ落とす。
10. `normalizeDepth` はゼロ除算を避ける。
11. segmentation、depth histogram、画像エッジを組み合わせてレイヤー分割する。
12. edge dilationとinpaintingは独立した処理として扱う。
13. Three.jsリソースは必ず `dispose()` する。
14. 画像差し替え、キャンセル、エラー復旧で古い結果を反映しない。

初期PRでは次を完了させる。

```text
- プロジェクト作成
- 型定義
- 画像アップロード
- 画像正規化
- DepthEstimator interface
- ONNX Runtime Webの推論導線
- backend判定
- depth map可視化
- depth正規化
- レイヤー生成を前提にしたデータ構造
- Worker分離の土台
- IndexedDB保存設計
- 最低限のテスト
```
