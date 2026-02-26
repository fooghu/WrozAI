// Celestia PWA - Service Worker
// Handles offline caching and push notifications

const CACHE_NAME = 'celestia-v1';
const OFFLINE_URLS = [
  './',
  './index.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Raleway:wght@300;400;600;700&family=Lora:ital,wght@0,400;1,400&display=swap',
];

// ── INSTALL: Cache core assets ────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(OFFLINE_URLS).catch(err => {
        console.log('Cache addAll partial failure (ok for external resources):', err);
      });
    })
  );
  self.skipWaiting();
});

// ── ACTIVATE: Clean old caches ────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── FETCH: Network-first for Swiss Ephemeris, cache-first for app ──
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Always fetch Swiss Ephemeris WASM from network (too large to cache)
  if (url.hostname === 'cdn.jsdelivr.net') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // Google Fonts: network first, fall back to cache
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // App files: cache first, then network
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});

// ── PUSH NOTIFICATIONS ─────────────────────────────────────────────
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Celestia · Transit Alert';
  const options = {
    body: data.body || 'A planetary transit is approaching.',
    icon: './icon-192.png',
    badge: './icon-192.png',
    tag: data.tag || 'celestia-transit',
    data: { url: data.url || './' },
    actions: [
      { action: 'view', title: 'View Transits' },
      { action: 'dismiss', title: 'Dismiss' }
    ],
    vibrate: [200, 100, 200]
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// ── NOTIFICATION CLICK ─────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (const client of windowClients) {
        if (client.url.includes('index.html') && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('./index.html#transits');
      }
    })
  );
});

// ── BACKGROUND SYNC (optional future use) ─────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'check-transits') {
    event.waitUntil(checkUpcomingTransits());
  }
});

async function checkUpcomingTransits() {
  // Future: could fetch ephemeris data and push notifications
  console.log('Background sync: checking transits...');
}
