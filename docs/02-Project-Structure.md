# プロジェクト構造

最終更新日: 2026-04-03

## 1. ディレクトリ構成

```text
parallax/
├── public/
│   └── models/                    # MLモデルファイル（遅延ロード）
│       ├── segmentation/          # MobileSAM ONNXモデル
│       ├── depth/                 # MiDaSモデル
│       └── inpainting/            # LaMaモデル（FP32/INT8）
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.tsx         # アプリヘッダー
│   │   │   ├── Footer.tsx         # フッター（ライセンス表示）
│   │   │   └── MainLayout.tsx     # レイアウトラッパー
│   │   ├── upload/
│   │   │   ├── ImageUploader.tsx  # ファイル選択UI
│   │   │   └── DropZone.tsx       # ドラッグ&ドロップエリア
│   │   ├── editor/
│   │   │   ├── ImageEditor.tsx    # 画像編集コンテナ
│   │   │   ├── MaskEditor.tsx     # マスク微調整（オプション）
│   │   │   └── PreviewCanvas.tsx  # 処理結果プレビュー
│   │   ├── viewer/
│   │   │   ├── ParallaxViewer.tsx # 視差ビューアコンテナ
│   │   │   ├── ThreeScene.tsx     # Three.jsシーン
│   │   │   └── ViewerControls.tsx # 視差強度・エクスポート
│   │   ├── progress/
│   │   │   ├── ProcessingProgress.tsx # 処理進捗バー
│   │   │   └── StepIndicator.tsx  # ステップ表示
│   │   └── ui/
│   │       ├── Button.tsx         # 汎用ボタン
│   │       ├── Slider.tsx         # スライダー
│   │       ├── Modal.tsx          # モーダル
│   │       └── Spinner.tsx        # ローディング
│   ├── hooks/
│   │   ├── useImageProcessor.ts   # 画像処理パイプライン
│   │   ├── useParallaxViewer.ts   # 視差ビューア制御
│   │   ├── useModelLoader.ts      # モデルロード管理
│   │   ├── usePointerTracking.ts  # マウス/タッチ追従
│   │   └── useDeviceCapabilities.ts # デバイス性能検出
│   ├── workers/
│   │   ├── segmentation.worker.ts # MobileSAMセグメンテーション
│   │   ├── depth.worker.ts        # MiDaS深度推定
│   │   ├── inpainting.worker.ts   # LaMaインペインティング
│   │   └── shared/
│   │       └── workerUtils.ts     # Worker共通ユーティリティ
│   ├── services/
│   │   ├── pipeline/
│   │   │   ├── PipelineManager.ts # パイプライン全体制御
│   │   │   ├── DepthEstimationService.ts
│   │   │   ├── InpaintingService.ts
│   │   │   └── ParallaxComposer.ts # 視差レイヤー合成
│   │   ├── models/
│   │   │   ├── ModelManager.ts    # モデルロード・キャッシュ
│   │   │   ├── ModelCache.ts      # IndexedDBキャッシュ
│   │   │   └── ModelDownloader.ts # 分割ダウンロード
│   │   ├── segmentation/          # MobileSAMセグメンテーション
│   │   │   ├── MobileSamEncoder.ts # MobileSAM Encoder
│   │   │   ├── MobileSamDecoder.ts # MobileSAM Decoder
│   │   │   ├── AutoMaskGenerator.ts # 自動マスク生成
│   │   │   ├── imagePreprocessor.ts # 画像前処理
│   │   │   ├── maskPostprocessor.ts # マスク後処理
│   │   │   ├── nms.ts             # Non-Maximum Suppression
│   │   │   ├── gridPointGenerator.ts # グリッドポイント生成
│   │   │   ├── instanceMerger.ts  # インスタンス統合
│   │   │   └── backgroundDetector.ts # 背景判定
│   │   └── image/
│   │       ├── ImageUtils.ts      # 画像変換・リサイズ
│   │       ├── CanvasUtils.ts     # Canvas操作
│   │       └── ExifProcessor.ts   # EXIF回転補正
│   ├── store/
│   │   ├── useAppStore.ts         # ルートストア
│   │   └── slices/
│   │       ├── imageSlice.ts      # 画像状態
│   │       ├── processingSlice.ts # 処理状態
│   │       └── viewerSlice.ts     # ビューア設定
│   ├── types/
│   │   ├── index.ts               # 共通型定義
│   │   ├── segmentation.ts        # セグメンテーション型
│   │   ├── image.ts               # 画像関連型
│   │   ├── pipeline.ts            # パイプライン型
│   │   ├── viewer.ts              # ビューア型
│   │   └── models.ts              # モデル関連型
│   ├── utils/
│   │   ├── deviceDetection.ts     # デバイス検出
│   │   ├── webgpuDetection.ts     # WebGPU対応検出
│   │   ├── tensorUtils.ts         # テンソル操作
│   │   └── validation.ts          # 入力バリデーション
│   ├── constants/
│   │   └── config.ts              # 設定定数
│   ├── App.tsx                    # アプリルート
│   ├── main.tsx                   # エントリーポイント
│   └── index.css                  # グローバルスタイル
├── docs/
│   ├── 01-Overview.md             # 概要・技術スタック・アーキテクチャ
│   ├── 02-Project-Structure.md    # プロジェクト構造（本ファイル）
│   ├── 03-Pipeline.md             # パイプライン詳細
│   ├── 04-Components.md           # コンポーネント実装
│   ├── 05-Implementation.md       # 実装計画
│   └── 06-Segmentation-Detail.md  # セグメンテーション詳細実装計画
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── eslint.config.js
├── .gitignore
└── CLAUDE.md
```

---

## 2. 依存パッケージ

### 2.1 本番依存関係

```json
{
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "three": "^0.170.0",
    "@react-three/fiber": "^9.0.0",
    "@react-three/drei": "^9.120.0",
    "onnxruntime-web": "^1.20.0",
    "zustand": "^5.0.0",
    "comlink": "^4.4.1",
    "idb": "^8.0.0"
  }
}
```

### 2.2 開発依存関係

```json
{
  "devDependencies": {
    "vite": "^6.0.0",
    "typescript": "^5.7.0",
    "@vitejs/plugin-react": "^4.3.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@types/three": "^0.170.0",
    "tailwindcss": "^4.0.0",
    "@tailwindcss/vite": "^4.0.0",
    "eslint": "^9.17.0",
    "@eslint/js": "^9.17.0",
    "typescript-eslint": "^8.18.0",
    "eslint-plugin-react-hooks": "^5.0.0",
    "eslint-plugin-react-refresh": "^0.4.16",
    "vite-plugin-comlink": "^5.0.0"
  }
}
```

### 2.3 パッケージ役割一覧

| パッケージ | 役割 |
| --- | --- |
| react, react-dom | UIフレームワーク |
| three | 3Dレンダリングエンジン |
| @react-three/fiber | React-Three.js統合 |
| @react-three/drei | Three.jsヘルパー |
| onnxruntime-web | ONNX ML推論（MobileSAM, MiDaS, LaMa） |
| zustand | 状態管理 |
| comlink | Web Worker通信簡素化 |
| idb | IndexedDB Promise API |
| vite | ビルドツール |
| tailwindcss | CSSフレームワーク |
