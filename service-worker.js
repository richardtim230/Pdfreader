const CACHE_NAME = 'oau-docs-cache';
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './pdf.worker.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
