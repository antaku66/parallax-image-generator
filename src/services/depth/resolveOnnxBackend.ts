// ONNX バックエンドの解決（MD §9）。
// navigator.gpu の有無では確定せず、実際の InferenceSession.create を試す。

import * as ort from "onnxruntime-web/webgpu";
import type { OnnxBackend } from "../../types";
import {
  getHardwareConcurrency,
  isSharedArrayBufferAvailable,
} from "../device/webgpuDetection";

let configured = false;

/** ORT 環境を一度だけ設定（wasmPaths / スレッド数） */
export function configureOrtEnv(): void {
  if (configured) return;
  // viteStaticCopy が wasm をルートへ配置済み
  ort.env.wasm.wasmPaths = self.location.origin + "/";
  // すでに Worker 内なので ORT の内部プロキシは無効
  ort.env.wasm.proxy = false;
  ort.env.wasm.numThreads = isSharedArrayBufferAvailable()
    ? Math.min(getHardwareConcurrency(), 4)
    : 1;
  configured = true;
}

/** WebGPU で作成を試み、失敗したら WASM へフォールバック */
export async function createSession(
  model: Uint8Array
): Promise<{ session: ort.InferenceSession; backend: OnnxBackend }> {
  configureOrtEnv();
  try {
    const session = await ort.InferenceSession.create(model, {
      executionProviders: ["webgpu"],
      graphOptimizationLevel: "all",
    });
    return { session, backend: "webgpu" };
  } catch {
    const session = await ort.InferenceSession.create(model, {
      executionProviders: ["wasm"],
      graphOptimizationLevel: "all",
    });
    return { session, backend: "wasm" };
  }
}
