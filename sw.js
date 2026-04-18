/* sw.js — X Club Service Worker */
const CACHE = 'xclub-v4';
const ASSETS = [
  './index.html',
  './style.css',
  './app.js',
  './firebase.js',
  './cloudinary.js',
  './manifest.json',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // Only cache same-origin GET requests; pass through Firebase/Cloudinary/CDN calls
  const url = new URL(e.request.url);
  const isLocal = url.origin === self.location.origin;
  const isGet = e.request.method === 'GET';

  if (!isGet || !isLocal) { e.respondWith(fetch(e.request)); return; }

  e.respondWith(
    caches.match(e.request).then(cached => {
      const net = fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => cached); // offline fallback
      return cached || net;
    })
  );
});
