import { useCallback } from "react";
import { useAppStore } from "../store/store";
import { cancelProcessing, startProcessing } from "../worker/workerClient";
import { newId } from "../utils/id";
import type { ProcessingEvent } from "../types";

/** Worker イベント → ストア反映。id が現行ジョブでなければ破棄（実装ガイド §20）。 */
function handleEvent(event: ProcessingEvent): void {
  const s = useAppStore.getState();
  if (event.id !== s.activeJobId) return;
  switch (event.type) {
    case "progress":
      s.setProgress({ stage: event.stage, percent: event.progress });
      break;
    case "complete":
      s.setAsset(event.asset);
      s.setPhase("viewer");
      s.setActiveJobId(null);
      break;
    case "error":
      if (event.fallbackAsset) {
        s.setAsset(event.fallbackAsset);
        s.setPhase("viewer");
      } else {
        s.setError(event.message);
        s.setPhase("error");
      }
      s.setActiveJobId(null);
      break;
  }
}

export function useProcessing() {
  const start = useCallback(async (file: File) => {
    const s = useAppStore.getState();
    // single-flight: 前ジョブをキャンセル
    if (s.activeJobId) cancelProcessing(s.activeJobId);
    if (s.sourceThumbnail?.startsWith("blob:")) URL.revokeObjectURL(s.sourceThumbnail);

    const id = newId();
    s.setError(null);
    s.setProgress({ stage: "loading-model", percent: 0 });
    s.setSourceThumbnail(URL.createObjectURL(file));
    s.setActiveJobId(id);
    s.setPhase("loading");

    try {
      await startProcessing({ id, file }, handleEvent);
    } catch (err) {
      const cur = useAppStore.getState();
      if (cur.activeJobId === id) {
        cur.setError(err instanceof Error ? err.message : "処理に失敗しました");
        cur.setPhase("error");
        cur.setActiveJobId(null);
      }
    }
  }, []);

  const cancel = useCallback(() => {
    const s = useAppStore.getState();
    if (s.activeJobId) cancelProcessing(s.activeJobId);
    s.setActiveJobId(null);
    s.setPhase("empty");
  }, []);

  return { start, cancel };
}
