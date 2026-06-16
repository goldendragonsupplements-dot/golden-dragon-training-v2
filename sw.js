// Golden Dragon Training - Service Worker
// Version: increment this to force cache update
const CACHE_VERSION = 'gd-v1';
const CACHE_NAME = `golden-dragon-${CACHE_VERSION}`;

// Files to cache for offline use
const STATIC_ASSETS = [
  '/',
  '/index.html'
];

// Install: cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // Silently fail if some assets aren't available
      });
    })
  );
  // Activate immediately without waiting for old SW to die
  self.skipWaiting();
});

// Activate: clean up old caches (does NOT touch localStorage)
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(key => key.startsWith('golden-dragon-') && key !== CACHE_NAME)
          .map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: network-first strategy for HTML, cache-first for other assets
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Always go network-first for the main HTML file
  // so updates deploy immediately
  if (event.request.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Cache the fresh version
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => {
          // Offline fallback: serve cached version
          return caches.match(event.request) || caches.match('/');
        })
    );
    return;
  }

  // For Firebase and other external requests: network only
  if (!url.origin.includes(self.location.origin)) {
    event.respondWith(fetch(event.request).catch(() => new Response('', {status: 503})));
    return;
  }

  // For other local assets: cache-first
  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      });
    }).catch(() => new Response('', {status: 503}))
  );
});

// Listen for messages from the app (e.g. force update)
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});
