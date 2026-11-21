const CACHE_NAME = 'vagou-portal-cache-v8';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
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
      .then((cache) => {
        return cache.addAll(PRECACHE_ASSETS).catch((err) => {
          console.warn('[SW] Aviso no pré-cache de alguns assets:', err);
        });
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      })
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
    url.origin.includes('supabase.co') ||
    url.origin.includes('run.app') && url.pathname.includes('socket')
  ) {
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(event.request).then((cached) => cached || caches.match('/index.html'));
        })
    );
    return;
  }

  const isBrandAsset =
    PRECACHE_ASSETS.includes(url.pathname) ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.jpg') ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com');

  if (isBrandAsset) {
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
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const copy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});

self.addEventListener('push', (event) => {
  let notificationData = {
    title: 'Vagou - Notificação',
    body: 'Você tem uma nova atualização no Vagou.',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: '/' },
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      const type = payload.type || 'generic';

      if (type === 'booking_confirmation') {
        notificationData = {
          title: payload.title || '🎉 Agendamento Confirmado!',
          body:
            payload.body ||
            `Seu horário para ${payload.serviceTitle || 'seu serviço'} no ${payload.salonName || 'salão'} foi confirmado com sucesso.`,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          data: {
            url: payload.url || '/agenda',
            protocolCode: payload.protocolCode,
            type: 'booking_confirmation',
          },
        };
      } else if (type === 'flash_offer') {
        notificationData = {
          title: payload.title || '⚡ Nova Vaga Relâmpago no Radar!',
          body:
            payload.body ||
            `Uma vaga imperdível para ${payload.serviceTitle || 'beleza'} acabou de abrir perto de você com desconto especial.`,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          data: {
            url: payload.url || '/ofertas',
            offerId: payload.offerId,
            type: 'flash_offer',
          },
        };
      } else {
        notificationData = {
          title: payload.title || notificationData.title,
          body: payload.body || notificationData.body,
          icon: payload.icon || '/icon-192.png',
          badge: payload.badge || '/icon-192.png',
          data: payload.data || { url: '/' },
        };
      }
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
    tag: notificationData.data?.type || 'vagou-notification',
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
