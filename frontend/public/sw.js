/* eslint-disable no-restricted-globals */

const CACHE_NAME = 'wayfinder-offline-v1';
const ROUTE_CACHE_NAME = 'wayfinder-routes-v1';

// Core app shell to cache on install
const APP_SHELL = [
  '/',
  '/index.html',
];

// Install: cache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL).catch(() => {});
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name !== CACHE_NAME && name !== ROUTE_CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

// Fetch: network-first for API, cache-first for static/media
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // API calls: network-first with cache fallback
  if (url.pathname.startsWith('/api/')) {
    // Only cache route/checkpoint data and media
    const cacheable = url.pathname.match(/\/api\/(routes|checkpoints|map\/schematic|media\/.*\/serve)/);
    if (cacheable) {
      event.respondWith(
        fetch(event.request)
          .then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(ROUTE_CACHE_NAME).then((cache) => cache.put(event.request, clone));
            }
            return response;
          })
          .catch(() => caches.match(event.request))
      );
    }
    return;
  }

  // Static assets: cache-first
  if (url.pathname.match(/\.(js|css|png|jpg|jpeg|webp|svg|woff2?)$/)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // HTML navigation: network-first
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/index.html'))
    );
  }
});

// Handle messages from the app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CACHE_ROUTE') {
    const { routeId, urls } = event.data;
    caches.open(ROUTE_CACHE_NAME).then((cache) => {
      const requests = urls.map((url) =>
        fetch(url).then((res) => {
          if (res.ok) cache.put(url, res);
        }).catch(() => {})
      );
      Promise.all(requests).then(() => {
        // Notify all clients that caching is done
        self.clients.matchAll().then((clients) => {
          clients.forEach((client) => {
            client.postMessage({ type: 'ROUTE_CACHED', routeId });
          });
        });
      });
    });
  }

  if (event.data && event.data.type === 'CLEAR_ROUTE_CACHE') {
    caches.delete(ROUTE_CACHE_NAME);
  }
});
