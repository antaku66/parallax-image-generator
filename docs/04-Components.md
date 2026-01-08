# コンポーネント実装

最終更新日: 2026-01-07

## 1. 主要コンポーネント詳細

### 1.1 PipelineManager.ts

**責務**: 処理パイプライン全体のオーケストレーション

```typescript
// src/services/pipeline/PipelineManager.ts
import { wrap } from 'comlink';

type ProcessingStep = 'idle' | 'preprocessing' | 'segmentation' | 'depth' | 'inpainting' | 'composing' | 'complete' | 'error';

interface PipelineState {
  step: ProcessingStep;
  progress: number;
  error: Error | null;
}

class PipelineManager {
  private segmentationWorker: Worker;
  private depthWorker: Worker;
  private inpaintingWorker: Worker;
  private onStateChange: (state: PipelineState) => void;

  constructor(onStateChange: (state: PipelineState) => void) {
    this.onStateChange = onStateChange;
    this.initializeWorkers();
  }

  private initializeWorkers(): void {
    this.segmentationWorker = new Worker(
      new URL('../workers/segmentation.worker.ts', import.meta.url),
      { type: 'module' }
    );
    this.depthWorker = new Worker(
      new URL('../workers/depth.worker.ts', import.meta.url),
      { type: 'module' }
    );
    this.inpaintingWorker = new Worker(
      new URL('../workers/inpainting.worker.ts', import.meta.url),
      { type: 'module' }
    );
  }

  async process(imageData: ImageData): Promise<ProcessedLayers> {
    try {
      // Step 1: 前処理
      this.updateState('preprocessing', 10);
      const preprocessed = await this.preprocess(imageData);

      // Step 2 & 3: セグメンテーションと深度推定を並列実行
      this.updateState('segmentation', 20);
      const [segmentation, depth] = await Promise.all([
        this.runSegmentation(preprocessed),
        this.runDepthEstimation(preprocessed)
      ]);

      // Step 4: インペインティング
      this.updateState('inpainting', 60);
      const inpainted = await this.runInpainting(preprocessed, segmentation.foregroundMask);

      // Step 5: 合成
      this.updateState('composing', 90);
      const layers = this.composeLayers(preprocessed, segmentation, inpainted, depth);

      this.updateState('complete', 100);
      return layers;

    } catch (error) {
      this.updateState('error', 0, error as Error);
      throw error;
    }
  }

  private updateState(step: ProcessingStep, progress: number, error?: Error): void {
    this.onStateChange({ step, progress, error: error || null });
  }

  dispose(): void {
    this.segmentationWorker.terminate();
    this.depthWorker.terminate();
    this.inpaintingWorker.terminate();
  }
}
```

### 1.2 useAppStore.ts

**責務**: Zustandによるグローバル状態管理

```typescript
// src/store/useAppStore.ts
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

interface ProcessedLayers {
  foreground: ImageData;
  foregroundMask: ImageData;
  background: ImageData;
  depthMap: Float32Array;
  width: number;
  height: number;
}

interface AppState {
  // 画像状態
  originalImage: ImageData | null;
  processedLayers: ProcessedLayers | null;

  // 処理状態
  processingStep: ProcessingStep;
  processingProgress: number;
  error: Error | null;

  // ビューア設定
  parallaxIntensity: number;
  qualityMode: 'high' | 'balanced' | 'fast';
  isFullscreen: boolean;

  // アクション
  setOriginalImage: (image: ImageData) => void;
  setProcessedLayers: (layers: ProcessedLayers) => void;
  updateProcessingState: (step: ProcessingStep, progress: number) => void;
  setError: (error: Error | null) => void;
  setParallaxIntensity: (value: number) => void;
  setQualityMode: (mode: 'high' | 'balanced' | 'fast') => void;
  toggleFullscreen: () => void;
  reset: () => void;
}

export const useAppStore = create<AppState>()(
  immer((set) => ({
    // 初期状態
    originalImage: null,
    processedLayers: null,
    processingStep: 'idle',
    processingProgress: 0,
    error: null,
    parallaxIntensity: 0.5,
    qualityMode: 'balanced',
    isFullscreen: false,

    // アクション
    setOriginalImage: (image) => set((state) => {
      state.originalImage = image;
      state.processedLayers = null;
      state.processingStep = 'idle';
    }),

    setProcessedLayers: (layers) => set((state) => {
      state.processedLayers = layers;
    }),

    updateProcessingState: (step, progress) => set((state) => {
      state.processingStep = step;
      state.processingProgress = progress;
    }),

    setError: (error) => set((state) => {
      state.error = error;
      state.processingStep = 'error';
    }),

    setParallaxIntensity: (value) => set((state) => {
      state.parallaxIntensity = value;
    }),

    setQualityMode: (mode) => set((state) => {
      state.qualityMode = mode;
    }),

    toggleFullscreen: () => set((state) => {
      state.isFullscreen = !state.isFullscreen;
    }),

    reset: () => set((state) => {
      state.originalImage = null;
      state.processedLayers = null;
      state.processingStep = 'idle';
      state.processingProgress = 0;
      state.error = null;
    })
  }))
);
```

### 1.3 ThreeScene.tsx

**責務**: Three.js視差レンダリング

```typescript
// src/components/viewer/ThreeScene.tsx
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useRef, useMemo } from 'react';
import * as THREE from 'three';

interface ThreeSceneProps {
  foregroundTexture: THREE.Texture;
  backgroundTexture: THREE.Texture;
  depthTexture: THREE.Texture;
  parallaxIntensity: number;
}

function ParallaxScene({ foregroundTexture, backgroundTexture, depthTexture, parallaxIntensity }: ThreeSceneProps) {
  const backgroundRef = useRef<THREE.Mesh>(null);
  const foregroundRef = useRef<THREE.Mesh>(null);
  const { pointer, size } = useThree();

  // スムーズな追従のための補間
  const targetPosition = useRef({ x: 0, y: 0 });
  const currentPosition = useRef({ x: 0, y: 0 });

  useFrame((_, delta) => {
    // ターゲット位置を更新
    targetPosition.current.x = pointer.x * parallaxIntensity;
    targetPosition.current.y = pointer.y * parallaxIntensity;

    // 滑らかに補間
    const lerpFactor = 1 - Math.pow(0.001, delta);
    currentPosition.current.x += (targetPosition.current.x - currentPosition.current.x) * lerpFactor;
    currentPosition.current.y += (targetPosition.current.y - currentPosition.current.y) * lerpFactor;

    // 背景レイヤー（遅い動き）
    if (backgroundRef.current) {
      backgroundRef.current.position.x = currentPosition.current.x * 0.3;
      backgroundRef.current.position.y = currentPosition.current.y * 0.3;
    }

    // 前景レイヤー（速い動き）
    if (foregroundRef.current) {
      foregroundRef.current.position.x = currentPosition.current.x * 0.8;
      foregroundRef.current.position.y = currentPosition.current.y * 0.8;
    }
  });

  // アスペクト比を維持
  const aspect = size.width / size.height;

  return (
    <>
      <ambientLight intensity={1} />

      {/* 背景レイヤー */}
      <mesh ref={backgroundRef} position={[0, 0, -0.5]}>
        <planeGeometry args={[aspect * 2, 2]} />
        <meshBasicMaterial map={backgroundTexture} />
      </mesh>

      {/* 前景レイヤー（深度マップで変形） */}
      <mesh ref={foregroundRef} position={[0, 0, 0]}>
        <planeGeometry args={[aspect * 2, 2, 128, 128]} />
        <meshStandardMaterial
          map={foregroundTexture}
          displacementMap={depthTexture}
          displacementScale={0.1}
          transparent
          alphaTest={0.5}
        />
      </mesh>
    </>
  );
}

export function ThreeScene(props: ThreeSceneProps) {
  return (
    <Canvas
      camera={{ position: [0, 0, 2], fov: 50 }}
      gl={{ antialias: true, alpha: true }}
      style={{ touchAction: 'none' }}
    >
      <ParallaxScene {...props} />
    </Canvas>
  );
}
```

### 1.4 ImageUploader.tsx

**責務**: 画像アップロードUI

```typescript
// src/components/upload/ImageUploader.tsx
import { useCallback } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { processImageFile } from '../../services/image/ImageUtils';

interface ImageUploaderProps {
  onImageProcessed?: () => void;
}

export function ImageUploader({ onImageProcessed }: ImageUploaderProps) {
  const { setOriginalImage, setError } = useAppStore();

  const handleFile = useCallback(async (file: File) => {
    try {
      // バリデーション
      if (!file.type.startsWith('image/')) {
        throw new Error('画像ファイルを選択してください');
      }
      if (file.size > 20 * 1024 * 1024) {
        throw new Error('ファイルサイズは20MB以下にしてください');
      }

      // 画像処理
      const imageData = await processImageFile(file);
      setOriginalImage(imageData);
      onImageProcessed?.();

    } catch (error) {
      setError(error as Error);
    }
  }, [setOriginalImage, setError, onImageProcessed]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      className="border-2 border-dashed border-gray-600 rounded-xl p-8
                 hover:border-blue-500 transition-colors cursor-pointer
                 flex flex-col items-center justify-center min-h-64"
    >
      <input
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        id="image-upload"
      />
      <label htmlFor="image-upload" className="cursor-pointer text-center">
        <div className="text-4xl mb-4">📷</div>
        <p className="text-lg font-medium text-gray-300">
          画像をドラッグ&ドロップ
        </p>
        <p className="text-sm text-gray-500 mt-2">
          または クリックしてファイルを選択
        </p>
        <p className="text-xs text-gray-600 mt-4">
          対応形式: JPEG, PNG, WebP (最大20MB)
        </p>
      </label>
    </div>
  );
}
```

---

## 2. モバイル対応戦略

### 2.1 品質モード自動選択

| モード | インペインティング | 画像サイズ | 対象デバイス | 処理時間目安 |
| --- | --- | --- | --- | --- |
| High | LaMa FP32 (WebGPU) | 512x512 | デスクトップ (8GB+) | ~3秒 |
| Balanced | LaMa INT8 (WASM) | 384x384 | タブレット/高性能スマホ | ~8秒 |
| Fast | Canvas API簡易補完 | 256x256 | 低スペックデバイス | ~2秒 |

### 2.2 デバイス検出ロジック

```typescript
// src/utils/deviceDetection.ts
interface DeviceCapabilities {
  hasWebGPU: boolean;
  deviceMemory: number;      // GB (navigator.deviceMemory)
  hardwareConcurrency: number; // CPUコア数
  isMobile: boolean;
  isLowEnd: boolean;
}

async function detectDeviceCapabilities(): Promise<DeviceCapabilities> {
  const hasWebGPU = 'gpu' in navigator && await checkWebGPUSupport();
  const deviceMemory = (navigator as any).deviceMemory || 4;
  const hardwareConcurrency = navigator.hardwareConcurrency || 4;
  const isMobile = /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent);
  const isLowEnd = deviceMemory < 4 || hardwareConcurrency < 4;

  return { hasWebGPU, deviceMemory, hardwareConcurrency, isMobile, isLowEnd };
}

function determineQualityMode(caps: DeviceCapabilities): 'high' | 'balanced' | 'fast' {
  if (caps.hasWebGPU && caps.deviceMemory >= 8 && !caps.isMobile) {
    return 'high';
  } else if (caps.deviceMemory >= 4 && !caps.isLowEnd) {
    return 'balanced';
  } else {
    return 'fast';
  }
}
```

### 2.3 モデルキャッシュ戦略

```typescript
// src/services/models/ModelCache.ts
import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'parallax-models';
const STORE_NAME = 'models';

class ModelCache {
  private db: IDBPDatabase | null = null;

  async init(): Promise<void> {
    this.db = await openDB(DB_NAME, 1, {
      upgrade(db) {
        db.createObjectStore(STORE_NAME);
      }
    });
  }

  async get(modelName: string): Promise<ArrayBuffer | null> {
    if (!this.db) await this.init();
    return this.db!.get(STORE_NAME, modelName);
  }

  async set(modelName: string, data: ArrayBuffer): Promise<void> {
    if (!this.db) await this.init();
    await this.db!.put(STORE_NAME, data, modelName);
  }

  async getCacheSize(): Promise<number> {
    // キャッシュサイズ計算
  }

  async clearOldModels(): Promise<void> {
    // 古いモデルを削除してストレージ節約
  }
}
```

### 2.4 分割ダウンロード

大きなモデル（LaMa 208MB）は分割してダウンロードし、進捗表示を改善。

```typescript
// src/services/models/ModelDownloader.ts
async function downloadModelWithProgress(
  url: string,
  onProgress: (loaded: number, total: number) => void
): Promise<ArrayBuffer> {
  const response = await fetch(url);
  const contentLength = Number(response.headers.get('Content-Length'));
  const reader = response.body!.getReader();

  const chunks: Uint8Array[] = [];
  let loaded = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    chunks.push(value);
    loaded += value.length;
    onProgress(loaded, contentLength);
  }

  // チャンクを結合
  const buffer = new ArrayBuffer(loaded);
  const view = new Uint8Array(buffer);
  let offset = 0;
  for (const chunk of chunks) {
    view.set(chunk, offset);
    offset += chunk.length;
  }

  return buffer;
}
```

### 2.5 最適化テクニック一覧

| カテゴリ | 手法 | 効果 |
| --- | --- | --- |
| **メモリ** | Transferable Objects | Workerへのデータ転送を高速化（コピーなし） |
| **メモリ** | 中間結果の即時解放 | メモリ使用量を削減 |
| **ネットワーク** | IndexedDBキャッシュ | 再訪問時のロード時間をゼロに |
| **ネットワーク** | 分割ダウンロード | 進捗表示改善、中断再開対応 |
| **描画** | GPU Compositing | CSS transform使用でGPU活用 |
| **描画** | OffscreenCanvas | Worker内でCanvas描画（実験的） |
| **処理** | 並列Worker実行 | セグメンテーションと深度推定を同時実行 |
