// Golden Dragon Training - Service Worker
// Version: increment this to force cache update
const CACHE_VERSION = 'gd-v2';
const CACHE_NAME = `golden-dragon-${CACHE_VERSION}`;

// Files to cache for offline use
const STATIC_ASSETS = [
  '/',
  '/index.html'
];

// Koliko dugo čekamo mrežu za glavnu stranicu prije nego pokažemo spremljenu verziju
const HTML_NETWORK_TIMEOUT_MS = 4000;

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

// Fetch
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // 1) Glavna stranica: mreža prva (da se nove verzije odmah vide),
  //    ali ako mreža kasni ili je nema, pokaži spremljenu verziju.
  if (event.request.mode === 'navigate' || (url.origin === self.location.origin && (url.pathname === '/' || url.pathname.endsWith('.html')))) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const network = fetch(event.request).then(response => {
        if (response && response.ok) cache.put(event.request, response.clone());
        return response;
      });
      const cached = await (cache.match(event.request) || null) || await cache.match('/');
      if (!cached) return network.catch(() => new Response('Offline', {status: 503}));
      const timeout = new Promise(resolve => setTimeout(() => resolve(cached), HTML_NETWORK_TIMEOUT_MS));
      try {
        return await Promise.race([network.catch(() => cached), timeout]);
      } catch (e) {
        return cached;
      }
    })());
    return;
  }

  // 2) Programi (programs/<id>.json?v=<hash>): spremljena verzija prva.
  //    Svaka nova verzija programa ima novi ?v=, pa se stara briše.
  if (url.origin === self.location.origin && url.pathname.startsWith('/programs/')) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const hit = await cache.match(event.request);
      if (hit) return hit;
      const response = await fetch(event.request);
      if (response && response.ok) {
        const keys = await cache.keys();
        await Promise.all(keys
          .filter(k => { const u = new URL(k.url); return u.pathname === url.pathname && u.search !== url.search; })
          .map(k => cache.delete(k)));
        await cache.put(event.request, response.clone());
      }
      return response;
    })());
    return;
  }

  // 3) Firebase i ostali vanjski zahtjevi: samo mreža
  if (url.origin !== self.location.origin) {
    event.respondWith(fetch(event.request).catch(() => new Response('', {status: 503})));
    return;
  }

  // 4) Ostale lokalne datoteke: spremljena verzija prva
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
