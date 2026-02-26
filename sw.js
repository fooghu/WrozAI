// WróżAI PWA - Service Worker v4
const CACHE_NAME = 'wrozai-v4';
const OFFLINE_URLS = ['./', './index.html', './manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(OFFLINE_URLS).catch(()=>{})));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => k !== CACHE_NAME && caches.delete(k))))
  );
  self.clients.claim();
});

// NETWORK FIRST - always get fresh app files
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.hostname !== self.location.hostname && url.hostname !== 'localhost') {
    event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
    return;
  }
  event.respondWith(
    fetch(event.request)
      .then(res => {
        if (res && res.status === 200) {
          caches.open(CACHE_NAME).then(c => c.put(event.request, res.clone()));
        }
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(self.registration.showNotification(data.title || 'WróżAI', {
    body: data.body || 'Transit alert', icon: './icon-192.png', tag: data.tag || 'wrozai'
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow('./'));
});
