/* 太阳系观测站 · Service Worker（离线缓存） */
const CACHE = "solar-orbitarium-v1";
const CORE = ["./", "./manifest.webmanifest", "./icons/icon.svg"];

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => Promise.allSettled(CORE.map((u) => c.add(u))))
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // 页面导航：网络优先，失败回退缓存
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).catch(() => caches.match("./")));
    return;
  }

  // 静态资源：缓存优先 + 后台更新
  e.respondWith(
    caches.match(req).then((cached) => {
      const fetched = fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || fetched;
    })
  );
});
