/* FitTrack service worker.
 *
 * - App shell: hashed Next.js assets are cached on first use (cache-first).
 * - Pages: network-first; the last successful copy is kept so a page you had
 *   open (for example a workout in progress) still loads on a dropped
 *   connection. The tracker then restores your latest sets from its
 *   on-device draft.
 * - Otherwise an offline page is shown.
 * - Never touches Supabase, Server Action (POST) or /api requests.
 * - Caches are deleted on sign-out (see SignOutButton).
 */

const VERSION = "v1";
const STATIC_CACHE = `fittrack-static-${VERSION}`;
const PAGE_CACHE = `fittrack-pages-${VERSION}`;
const OFFLINE_URL = "/offline";
const PRECACHE = [OFFLINE_URL, "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];
const MAX_PAGES = 30;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("fittrack-") && ![STATIC_CACHE, PAGE_CACHE].includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "fittrack:clear-caches") {
    event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith("fittrack-")).map((k) => caches.delete(k)))));
  }
});

// Tapping the "Rest over" notification returns to the open workout.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const open = windows[0];
      return open ? open.focus() : self.clients.openWindow("/workout");
    }),
  );
});

function isStaticAsset(url) {
  return url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || url.pathname === "/manifest.webmanifest" || url.pathname.startsWith("/__nextjs_font/");
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

async function trimPages(cache) {
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - MAX_PAGES)).map((k) => cache.delete(k)));
}

async function networkFirstPage(request) {
  const cache = await caches.open(PAGE_CACHE);
  try {
    const response = await fetch(request);
    // Keep only successful, non-redirected app pages (never the login screen).
    if (response.ok && !response.redirected && response.type === "basic") {
      await cache.put(request, response.clone());
      trimPages(cache);
    }
    return response;
  } catch {
    const cached = await cache.match(request, { ignoreSearch: false });
    if (cached) return cached;
    return (await caches.match(OFFLINE_URL)) ?? new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } });
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Exports contain private data and must never be cached.
  if (url.pathname.startsWith("/api/")) return;

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Full page loads only; client-side navigations (RSC requests) go straight to the network.
  if (request.mode === "navigate" && !request.headers.has("RSC")) {
    event.respondWith(networkFirstPage(request));
  }
});
