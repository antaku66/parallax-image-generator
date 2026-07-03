// WebGPU / 実行環境の検出（Worker/Main 双方で利用）
//
// 注意: ここでの WebGPU 判定は「存在」のみ。実際のバックエンド確定は
// resolveOnnxBackend が InferenceSession.create で行う（MD §9）。

export function isWebGPUAvailable(): boolean {
  return typeof navigator !== "undefined" && "gpu" in navigator;
}

/** マルチスレッド WASM に必要（COOP/COEP が効いているか） */
export function isSharedArrayBufferAvailable(): boolean {
  return (
    typeof SharedArrayBuffer !== "undefined" &&
    (globalThis as { crossOriginIsolated?: boolean }).crossOriginIsolated === true
  );
}

export function getHardwareConcurrency(): number {
  return (typeof navigator !== "undefined" && navigator.hardwareConcurrency) || 4;
}

export function isMobileUA(): boolean {
  return (
    typeof navigator !== "undefined" &&
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
  );
}
