const CACHE_NAME = "enigma-shell-v1";
const SHELL_ASSETS = ["/login"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first for everything. This app is data-driven (tasks, chat, invoices)
// so we deliberately avoid caching API/page responses — a stale cached dashboard
// showing old data would be worse than no offline support at all. This only
// gives a graceful "you're offline" fallback for the login shell.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request).catch(() =>
      caches.match(event.request).then((cached) => cached || caches.match("/login"))
    )
  );
});
