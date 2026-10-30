/* ============================================================
   Trackly Service Worker v3.0 — NETWORK-ONLY (Offline Fallback)
   ============================================================
   PROBLEM: Previous SW used cache-first for static assets, which
   served STALE JS bundles. Users saw old app version after a few
   seconds because cached JS overwrote fresh network JS.

   FIX: This SW is NETWORK-ONLY. It NEVER serves cached content
   when the network is available. Cache is used ONLY as a fallback
   when the network fails (true offline mode).

   This means:
   - Online → always fresh content from server
   - Offline → cached content as fallback
   - No stale content ever served when online
   ============================================================ */

const CACHE_VERSION = "trackly-v3-network-only";
const CACHE_NAME = `${CACHE_VERSION}-fallback`;

// Install — activate immediately, don't wait.
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

// Activate — delete old caches. NO client reload (prevents refresh loops).
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

// Fetch — NETWORK ONLY with cache-busting. Zero stale content.
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle GET
  if (request.method !== "GET") return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  // Skip cross-origin
  if (url.origin !== self.location.origin) return;

  // Skip HMR, dev tools, auth
  if (url.pathname.startsWith("/_next/webpack-hmr")) return;
  if (url.pathname.startsWith("/_next/dev")) return;
  if (url.pathname.startsWith("/__nextjs")) return;
  if (url.pathname.endsWith(".map")) return;

  // For ALL requests: network-first with cache-busting headers
  // Add no-cache to ensure browser doesn't serve stale HTTP cache
  const fetchOptions = new Request(request, {
    cache: "no-store",
    credentials: "same-origin",
  });

  event.respondWith(
    fetch(fetchOptions)
      .then((response) => {
        // Cache successful responses for offline fallback ONLY
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, clone).catch(() => {});
          });
        }
        return response;
      })
      .catch(() => {
        // Network failed — we're offline. Try cache.
        return caches.match(request).then((cached) => {
          if (cached) return cached;
          if (request.mode === "navigate") {
            // App lives at /app now; root is the marketing/demo page.
            return (
              caches.match("/app").then((app) => app || caches.match("/")) ||
              caches.match("/")
            );
          }
          return new Response("Offline", {
            status: 503,
            headers: { "Content-Type": "text/plain" },
          });
        });
      })
  );
});

// Handle messages from page
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
  if (event.data && event.data.type === "CLEAR_CACHE") {
    caches.keys().then((keys) => {
      Promise.all(keys.map((k) => caches.delete(k))).then(() => {
        event.source && event.source.postMessage({ type: "CACHE_CLEARED" });
      });
    });
  }
});
