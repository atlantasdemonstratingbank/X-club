/* sw.js — X Club Service Worker */
'use strict';

const CACHE_NAME   = 'xclub-v1';
const STATIC_URLS  = ['/', '/index.html', '/style.css', '/app.js', '/firebase.js', '/cloudinary.js', '/manifest.json'];

/* ── Install: cache static shell ─────────────────────────────────────── */
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(c => c.addAll(STATIC_URLS).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

/* ── Activate: clean old caches ──────────────────────────────────────── */
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* ── Fetch: network-first, fallback to cache ─────────────────────────── */
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  /* Skip Firebase / Cloudinary — always live */
  if (url.hostname.includes('firebase') || url.hostname.includes('cloudinary')) return;

  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request).then(r => r || caches.match('/index.html')))
  );
});

/* ── Push notifications ───────────────────────────────────────────────── */
self.addEventListener('push', e => {
  let data = { title: 'X Club', body: 'You have a new notification.', icon: '/icons/icon-192.png', badge: '/icons/icon-96.png', tag: 'xclub-notif' };
  try { if (e.data) Object.assign(data, e.data.json()); } catch (_) {}

  e.waitUntil(
    self.registration.showNotification(data.title, {
      body:    data.body,
      icon:    data.icon,
      badge:   data.badge,
      tag:     data.tag,
      vibrate: [200, 100, 200],
      data:    { url: data.url || '/' }
    })
  );
});

/* ── Notification click ───────────────────────────────────────────────── */
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const target = (e.notification.data && e.notification.data.url) || '/';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if (c.url.includes(self.location.origin) && 'focus' in c) { c.focus(); c.postMessage({ type: 'NAVIGATE', url: target }); return; }
      }
      if (clients.openWindow) return clients.openWindow(target);
    })
  );
});

/* ── Background sync (message queue) ─────────────────────────────────── */
self.addEventListener('sync', e => {
  if (e.tag === 'xclub-msg-sync') {
    e.waitUntil(
      self.clients.matchAll().then(cs => cs.forEach(c => c.postMessage({ type: 'SYNC_MESSAGES' })))
    );
  }
});
