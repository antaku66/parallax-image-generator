// Service Worker（実装ガイド §21）。
// アプリシェル（ナビゲーション）は stale-while-revalidate、ハッシュ付きバンドルと
// ORT wasm は cache-first でキャッシュする。モデル本体（/models/, 約97MB）は
// modelManifest.ts が Cache Storage（spatial-scene-models-v1）で管理するため触らない。
//
// COEP 注意: cache.put は Response のヘッダを保持するため、同一オリジン応答の
// キャッシュ配信は require-corp 下の crossOriginIsolated を壊さない。

// ort-wasm-* はファイル名にハッシュが付かないため、onnxruntime-web を
// 更新したらこのバージョンを上げて旧キャッシュを破棄する。
const VERSION = "v1";
const SHELL_CACHE = `spatial-scene-shell-${VERSION}`;
const STATIC_CACHE = `spatial-scene-static-${VERSION}`;
// ナビゲーションは URL に関わらずシェル 1 枚（SPA）としてこのキーに正規化する
const SHELL_KEY = "/";
// この SW が管理するキャッシュ。models は modelManifest.ts の所有物なので含めない
const MANAGED = /^spatial-scene-(shell|static)-/;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.add(SHELL_KEY))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // 自分の管理する旧バージョンのキャッシュのみ削除する
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => MANAGED.test(k) && k !== SHELL_CACHE && k !== STATIC_CACHE)
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

/** シェル: キャッシュを即返しつつ裏で更新（オフライン時はキャッシュのみ） */
async function staleWhileRevalidateShell(event) {
  const cache = await caches.open(SHELL_CACHE);
  const revalidate = fetch(event.request)
    .then(async (res) => {
      if (res.ok) await cache.put(SHELL_KEY, res.clone());
      return res;
    })
    .catch(() => undefined);
  // キャッシュ返却直後に SW が停止しても裏側更新を完走させる
  event.waitUntil(revalidate);
  const cached = await cache.match(SHELL_KEY);
  if (cached) return cached;
  const fresh = await revalidate;
  return fresh ?? Response.error();
}

/** ハッシュ付き資産・ORT wasm: キャッシュ優先（ミス時のみ取得して保存） */
async function cacheFirst(event) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(event.request);
  if (cached) return cached;
  const res = await fetch(event.request);
  // 応答返却後の保存完了まで SW を延命する
  if (res.ok) event.waitUntil(cache.put(event.request, res.clone()));
  return res;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  // HEAD（モデル存在確認）等の非 GET は素通し
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  // クロスオリジン（Google Fonts 等）とモデルは素通し
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/models/")) return;

  if (request.mode === "navigate") {
    event.respondWith(staleWhileRevalidateShell(event));
  } else if (
    url.pathname.startsWith("/assets/") ||
    /^\/ort-wasm-.+\.(mjs|wasm)$/.test(url.pathname)
  ) {
    event.respondWith(cacheFirst(event));
  }
  // それ以外は素通し（ブラウザ既定の取得に委ねる）
});
