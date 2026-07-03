// キャンセル管理（MD §17）。推論自体は中断できないため、ステージ境界で打ち切る。

export class CancelledError extends Error {
  constructor() {
    super("処理がキャンセルされました");
    this.name = "CancelledError";
  }
}

export class CancellationRegistry {
  private cancelled = new Set<string>();

  cancel(id: string): void {
    this.cancelled.add(id);
  }

  isCancelled(id: string): boolean {
    return this.cancelled.has(id);
  }

  clear(id: string): void {
    this.cancelled.delete(id);
  }
}

/** キャンセルされていれば CancelledError を投げる */
export function checkpoint(shouldCancel: () => boolean): void {
  if (shouldCancel()) throw new CancelledError();
}
