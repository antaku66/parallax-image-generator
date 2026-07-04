// モデルの存在確認・取得・キャッシュ（MD §6, §18）

import { MODELS, modelUrl } from "../../constants/models";
import type { ModelName } from "../../types";

const MODEL_CACHE = "spatial-scene-models-v1";

/**
 * モデルが配置されているか。未配置なら CSS/Canvas フォールバックへ落とす（MD §20）。
 * SPA ホストが 404 に index.html を返す罠を content-type で回避。
 */
export async function isModelAvailable(model: ModelName): Promise<boolean> {
  try {
    const res = await fetch(modelUrl(model), { method: "HEAD" });
    const ct = res.headers.get("content-type") ?? "";
    return res.ok && !ct.includes("text/html");
  } catch {
    return false;
  }
}

/** モデルバイト列を取得（Cache Storage 優先, DL 進捗対応） */
export async function fetchModelBytes(
  model: ModelName,
  onProgress?: (loaded: number, total: number) => void
): Promise<Uint8Array> {
  const url = modelUrl(model);
  const cache = await caches.open(MODEL_CACHE).catch(() => null);
  if (cache) {
    const hit = await cache.match(url);
    if (hit) return new Uint8Array(await hit.arrayBuffer());
  }

  const res = await fetch(url);
  if (!res.ok) throw new Error(`モデル取得に失敗しました: ${res.status}`);

  const total = Number(res.headers.get("content-length")) || MODELS[model].sizeBytes;
  const reader = res.body?.getReader();
  let bytes: Uint8Array;
  if (!reader) {
    bytes = new Uint8Array(await res.arrayBuffer());
  } else {
    const chunks: Uint8Array[] = [];
    let loaded = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      loaded += value.length;
      onProgress?.(loaded, total);
    }
    bytes = new Uint8Array(loaded);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
  }

  if (cache) {
    try {
      await cache.put(
        url,
        new Response(new Uint8Array(bytes), {
          headers: { "content-type": "application/octet-stream" },
        })
      );
    } catch {
      // キャッシュ失敗は致命的でない
    }
  }
  return bytes;
}
