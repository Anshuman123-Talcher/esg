/**
 * PS8 ESG & BRSR Reporting - Service Worker
 * Provides offline caching for the application shell.
 */

const CACHE_NAME = 'ps8-esg-v1';
const SHELL_ASSETS = [
  './',
  './index.html',
  './login.html',
  './manifest.json',
  './css/variables.css',
  './css/layout.css',
  './css/components.css',
  './css/login.css',
  './css/print.css',
  './js/data/defaultData.js',
  './js/store.js',
  './js/auth.js',
  './js/charts.js',
  './js/workflow.js',
  './js/reports.js',
  './js/ui.js',
  './js/app.js',
  './assets/meil-logo.png',
  './assets/icon-192.png',
  './assets/icon-512.png'
];

// Install: pre-cache application shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Pre-caching shell assets');
      // Cache each asset individually; don't fail entire install on one bad asset
      return Promise.allSettled(
        SHELL_ASSETS.map(url => cache.add(url).catch(err => console.warn('[SW] Failed to cache:', url, err)))
      );
    }).then(() => self.skipWaiting())
  );
});

// Activate: clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => 
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => {
          console.log('[SW] Deleting old cache:', key);
          return caches.delete(key);
        })
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: Network-first strategy for navigation; cache-first for static assets
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and cross-origin requests (CDNs)
  if (request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  // For navigation requests (HTML pages): network-first
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // For other shell assets: cache-first with network fallback
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return response;
      });
    })
  );
});
