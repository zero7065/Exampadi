// ExamPadi service worker — plain JS, zero external dependencies.
// Deliberately avoids loading Workbox from storage.googleapis.com so offline
// support works even when that host is blocked.

const VERSION = "exampadi-v2";
const PAGES_CACHE = `${VERSION}-pages`;
const ASSETS_CACHE = `${VERSION}-assets`;
const IMAGES_CACHE = `${VERSION}-images`;
const NETWORK_TIMEOUT_MS = 5000;

// Never intercept Firebase/Auth/API traffic — let the browser handle it directly.
// This prevents the SW from caching failed auth responses.
function isApiRequest(url, request) {
  if (request.method !== "GET") return true;
  const host = url.hostname;
  return (
    host.endsWith("googleapis.com") ||
    host.endsWith("gstatic.com") ||
    host.endsWith("google.com") ||
    host.endsWith("groq.com") ||
    host.endsWith("paystack.co") ||
    host.includes("sentry")
  );
}

self.addEventListener("install", (event) => {
  // Don't skipWaiting automatically — activation happens on next navigation
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((n) => !n.startsWith(VERSION))
          .map((n) => caches.delete(n))
      );
      await self.clients.claim();
    })()
  );
});

function fetchWithTimeout(request, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("network-timeout")), ms);
    fetch(request)
      .then((res) => { clearTimeout(timer); resolve(res); })
      .catch((err) => { clearTimeout(timer); reject(err); });
  });
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin GET requests; never API traffic
  if (request.method !== "GET") return;
  if (url.origin !== self.location.origin) return;
  if (isApiRequest(url, request)) return;

  // 1) Page navigations — NetworkFirst with cache fallback
  if (request.mode === "navigate" || request.destination === "document") {
    event.respondWith(
      (async () => {
        try {
          const res = await fetchWithTimeout(request, NETWORK_TIMEOUT_MS);
          const cache = await caches.open(PAGES_CACHE);
          cache.put(request, res.clone());
          return res;
        } catch (_) {
          const cached =
            (await caches.match(request)) ||
            (await caches.match("/index.html"));
          return cached || Response.error();
        }
      })()
    );
    return;
  }

  // 2) Scripts & styles — StaleWhileRevalidate
  if (request.destination === "script" || request.destination === "style") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(ASSETS_CACHE);
        const cached = await cache.match(request);
        const network = fetch(request)
          .then((res) => {
            if (res && res.ok) cache.put(request, res.clone());
            return res;
          })
          .catch(() => null);
        return cached || (await network) || Response.error();
      })()
    );
    return;
  }

  // 3) Images — CacheFirst
  if (
    request.destination === "image" ||
    /\.(png|svg|jpg|jpeg|webp|ico|gif)$/i.test(url.pathname)
  ) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(IMAGES_CACHE);
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const res = await fetch(request);
          if (res && res.ok) cache.put(request, res.clone());
          return res;
        } catch (_) {
          return Response.error();
        }
      })()
    );
  }
});

// ─── Web push (FCM) ───
self.addEventListener("push", (event) => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch { payload = {}; }
  const n = payload.notification || {};
  const data = payload.data || {};
  const title = n.title || data.title || "ExamPadi";
  const body = n.body || data.body || "You have a new update.";
  const link = data.link || n.click_action || "/dashboard";
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: data.id || "exampadi",
      data: { link },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = event.notification.data?.link || "/dashboard";
  event.waitUntil(
    (async () => {
      const clientsList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of clientsList) {
        if ("focus" in client) {
          client.navigate?.(link);
          return client.focus();
        }
      }
      return self.clients.openWindow(link);
    })()
  );
});

// Handle skip waiting
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
