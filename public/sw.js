// Service Worker（Phase 5 雛形）。
// 現状はネットワーク素通し。モデル/ORT wasm は Cache Storage 側（modelManifest.ts）で扱う。
// TODO(Phase 5): アプリシェルの precache と stale-while-revalidate を実装する。

const SHELL_CACHE = "spatial-scene-shell-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // 素通し（ブラウザ既定の取得に委ねる）
});
