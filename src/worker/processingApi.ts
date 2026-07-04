// Worker の Comlink 公開面（型）

import type { ProcessingEvent } from "../types";

export type StartRequest = {
  id: string;
  file: File;
};

export type ProcessingEventCallback = (event: ProcessingEvent) => void;

export interface ProcessingWorkerApi {
  start(req: StartRequest, onEvent: ProcessingEventCallback): Promise<void>;
  cancel(id: string): void;
}
