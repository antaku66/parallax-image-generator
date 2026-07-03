// Worker の main 側クライアント（Comlink.wrap + ライフサイクル）

import * as Comlink from "comlink";
import type { ProcessingEvent } from "../types";
import type { ProcessingWorkerApi, StartRequest } from "./processingApi";

let worker: Worker | null = null;
let api: Comlink.Remote<ProcessingWorkerApi> | null = null;

function ensureApi(): Comlink.Remote<ProcessingWorkerApi> {
  if (!worker) {
    worker = new Worker(new URL("./processing.worker.ts", import.meta.url), {
      type: "module",
    });
    api = Comlink.wrap<ProcessingWorkerApi>(worker);
  }
  return api!;
}

export async function startProcessing(
  req: StartRequest,
  onEvent: (event: ProcessingEvent) => void
): Promise<void> {
  const a = ensureApi();
  await a.start(req, Comlink.proxy(onEvent));
}

export function cancelProcessing(id: string): void {
  void api?.cancel(id);
}

export function terminateWorker(): void {
  worker?.terminate();
  worker = null;
  api = null;
}
