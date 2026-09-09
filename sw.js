const CACHE_NAME = 'mywallet-cache-v24';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icon.png',
  './icon-192.png',
  './icon-512.png',
  './logo-icon.png',
  './css/variables.css',
  './css/base.css',
  './css/layout.css',
  './css/components.css',
  './css/pages.css',
  './js/utils.js',
  './js/i18n.js',
  './js/store.js',
  './js/ai-intents.js',
  './js/ai-remote.js',
  './js/tx-periods.js',
  './js/tx-summary.js',
  './js/router.js',
  './js/components.js',
  './js/pages/dashboard.js',
  './js/pages/transactions.js',
  './js/pages/transaction-form.js',
  './js/pages/wallets.js',
  './js/pages/debts.js',
  './js/pages/bills.js',
  './js/ai-tools.js',
  './js/pages/ai-assistant.js',
  './js/pages/custom-endpoints.js',
  './js/pages/settings.js',
  './js/app.js'
];

// Install: pre-cache all app shell resources
self.addEventListener('install', event => {
  self.skipWaiting(); // Activate immediately
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

// Activate: claim clients immediately and clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim()) // Take control immediately
  );
});

// Fetch: Stale-While-Revalidate for app files, cache-first for fonts
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // For Google Fonts / external CDN: cache-first (they rarely change)
  if (url.origin !== location.origin) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // For local app files: stale-while-revalidate
  // Serve cached version instantly, fetch update in background
  event.respondWith(
    caches.match(event.request).then(cached => {
      const fetchPromise = fetch(event.request).then(networkResponse => {
        if (networkResponse.ok) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return networkResponse;
      }).catch(() => cached); // Fallback to cache if offline

      return cached || fetchPromise;
    })
  );
});
