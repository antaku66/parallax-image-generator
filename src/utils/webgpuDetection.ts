// WebGPU/WASM 検出ユーティリティ

import type { OnnxExecutionProvider } from "../types/segmentation";

/** WebGPU サポート情報 */
export interface WebGPUSupportInfo {
  supported: boolean;
  adapter: GPUAdapter | null;
  device: GPUDevice | null;
  adapterInfo: GPUAdapterInfo | null;
  error: string | null;
}

/** WebGPU の利用可能性を検出 */
export async function detectWebGPUSupport(): Promise<WebGPUSupportInfo> {
  if (typeof navigator === "undefined" || !("gpu" in navigator)) {
    return {
      supported: false,
      adapter: null,
      device: null,
      adapterInfo: null,
      error: "WebGPU API is not available in this browser",
    };
  }

  try {
    const adapter = await navigator.gpu.requestAdapter({
      powerPreference: "high-performance",
    });

    if (!adapter) {
      return {
        supported: false,
        adapter: null,
        device: null,
        adapterInfo: null,
        error: "No GPU adapter available",
      };
    }

    const device = await adapter.requestDevice();

    return {
      supported: true,
      adapter,
      device,
      adapterInfo: adapter.info,
      error: null,
    };
  } catch (error) {
    return {
      supported: false,
      adapter: null,
      device: null,
      adapterInfo: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/** SharedArrayBuffer の利用可能性を確認（マルチスレッド WASM に必要） */
export function isSharedArrayBufferAvailable(): boolean {
  return typeof SharedArrayBuffer !== "undefined" && crossOriginIsolated;
}

/** 推奨実行プロバイダーを取得 */
export async function getRecommendedExecutionProvider(): Promise<OnnxExecutionProvider> {
  const webgpuInfo = await detectWebGPUSupport();
  return webgpuInfo.supported ? "webgpu" : "wasm";
}

/** ハードウェア並列数を取得（WASM スレッド数の決定に使用） */
export function getHardwareConcurrency(): number {
  return typeof navigator !== "undefined" && navigator.hardwareConcurrency
    ? navigator.hardwareConcurrency
    : 4;
}

/** デバイス性能情報 */
export interface DeviceCapabilities {
  webgpuSupported: boolean;
  sharedArrayBufferAvailable: boolean;
  hardwareConcurrency: number;
  recommendedProvider: OnnxExecutionProvider;
  isMobile: boolean;
}

/** デバイス性能を総合的に検出 */
export async function detectDeviceCapabilities(): Promise<DeviceCapabilities> {
  const [webgpuInfo, recommendedProvider] = await Promise.all([
    detectWebGPUSupport(),
    getRecommendedExecutionProvider(),
  ]);

  const isMobile =
    typeof navigator !== "undefined" &&
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  return {
    webgpuSupported: webgpuInfo.supported,
    sharedArrayBufferAvailable: isSharedArrayBufferAvailable(),
    hardwareConcurrency: getHardwareConcurrency(),
    recommendedProvider,
    isMobile,
  };
}
