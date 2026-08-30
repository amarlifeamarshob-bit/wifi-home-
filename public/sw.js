// Minimal service worker — only exists so Chrome/Android treats this site as
// installable ("Add to Home Screen" / "Install app"). It does NOT aggressively
// cache the app, so people always see the latest products/prices; it just
// falls back to a cached copy of a page if the network request fails
// (e.g. briefly offline), which is a nice bonus rather than the main point.

const CACHE_NAME = "wifi-home-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
