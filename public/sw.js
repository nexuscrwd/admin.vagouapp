const CACHE_NAME = 'admin-vapp-cache-v10';

const PRECACHE_ASSETS = [
  '/icon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/logo.svg',
  '/logo.png',
  '/logo_light.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'PURGE_ALL_CACHES') {
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))));
  }
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  if (
    url.pathname.startsWith('/@') ||
    url.pathname.startsWith('/src/') ||
    url.pathname.includes('node_modules') ||
    url.pathname.includes('hot-update') ||
    url.pathname.startsWith('/api/') ||
    url.pathname === '/manifest.json' ||
    url.pathname === '/sw.js' ||
    url.origin.includes('supabase.co') ||
    (url.origin.includes('run.app') && url.pathname.includes('socket'))
  ) {
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(new Request(event.request, { cache: 'no-cache' }))
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', copy));
          }
          return networkResponse;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  const isStaticIcon =
    PRECACHE_ASSETS.includes(url.pathname) ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com');

  if (isStaticIcon) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          fetch(event.request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                const copy = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
              }
            })
            .catch(() => {});
          return cachedResponse;
        }

        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

self.addEventListener('push', (event) => {
  let notificationData = {
    title: 'Admin-Vapp - Notificação',
    body: 'Nova atualização registrada no Admin-Vapp.',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: '/', eventType: 'admin_event' },
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      notificationData = {
        title: payload.title || notificationData.title,
        body: payload.body || notificationData.body,
        icon: payload.icon || '/icon-192.png',
        badge: payload.badge || '/icon-192.png',
        data: {
          url: payload.url || payload.data?.url || '/',
          eventType: payload.eventType || payload.type || 'admin_event',
          ...(payload.data && typeof payload.data === 'object' ? payload.data : {}),
        },
      };
    } catch {
      notificationData.body = event.data.text();
    }
  }

  const notificationOptions = {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: notificationData.badge,
    data: notificationData.data,
    vibrate: [200, 100, 200],
    tag: `${notificationData.data?.eventType || 'admin-vapp'}-${Date.now()}`,
    renotify: true,
  };

  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationOptions)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) {
            client.postMessage({
              type: 'NOTIFICATION_CLICKED',
              data: event.notification.data,
            });
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});
