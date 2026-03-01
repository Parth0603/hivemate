// Service Worker for HiveMate
const CACHE_VERSION = 'v2';
const STATIC_CACHE = `hivemate-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `hivemate-dynamic-${CACHE_VERSION}`;

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons.svg'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== STATIC_CACHE && name !== DYNAMIC_CACHE)
          .map((name) => caches.delete(name))
      );
    })
  );
  return self.clients.claim();
});

// Fetch event - network-first for app shell, cache-first for static chunks
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip API calls and WebSocket connections
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/socket.io')) {
    return;
  }

  const isNavigation = request.mode === 'navigate';
  const isIndexRequest = url.pathname === '/' || url.pathname === '/index.html';
  const isHashedAsset = /^\/assets\/.+\.[a-z0-9]+?\.(js|css)$/i.test(url.pathname);

  if (isNavigation || isIndexRequest) {
    event.respondWith(
      fetch(request, { cache: 'no-store' })
        .then((networkResponse) => networkResponse)
        .catch(async () => {
          const cache = await caches.open(STATIC_CACHE);
          return (await cache.match('/')) || (await cache.match('/index.html'));
        })
    );
    return;
  }

  if (isHashedAsset) {
    event.respondWith(
      caches.match(request).then(async (cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        const networkResponse = await fetch(request);
        if (networkResponse && networkResponse.status === 200) {
          const cache = await caches.open(DYNAMIC_CACHE);
          cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      })
    );
    return;
  }

  event.respondWith(
    fetch(request)
      .then(async (networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const cache = await caches.open(DYNAMIC_CACHE);
          cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      })
      .catch(() => caches.match(request))
  );
});

// Handle messages from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Push event - friend request notifications (PWA).
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'HiveMate', body: event.data.text() };
  }

  const title = payload.title || 'HiveMate';
  const isMessageNotification = payload.notificationType === 'message';
  const isCallNotification = payload.notificationType === 'call_request';
  const primaryActionTitle = isCallNotification
    ? 'Answer call'
    : isMessageNotification
      ? 'View message'
      : 'View request';
  const primaryAction = isCallNotification ? 'answer' : 'open';
  const options = {
    body: payload.body || 'You have a new update.',
    icon: payload.icon || '/icons.svg',
    badge: payload.badge || '/icons.svg',
    tag: payload.tag || 'hivemate-notification',
    renotify: true,
    requireInteraction: isCallNotification,
    vibrate: isCallNotification ? [180, 80, 180, 80, 180] : [120, 60, 120],
    data: {
      url: payload.url || '/connections'
    },
    actions: [
      { action: primaryAction, title: primaryActionTitle },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  let targetUrl = (event.notification && event.notification.data && event.notification.data.url) || '/connections';
  if (event.action === 'answer') {
    try {
      const urlObj = new URL(targetUrl, self.location.origin);
      urlObj.searchParams.set('autoAnswer', '1');
      targetUrl = urlObj.toString();
    } catch {
      // keep original url on parse issues
    }
  } else if (!/^https?:\/\//i.test(targetUrl)) {
    try {
      targetUrl = new URL(targetUrl, self.location.origin).toString();
    } catch {
      // keep original value
    }
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          try {
            await client.focus();
            if ('navigate' in client) {
              await client.navigate(targetUrl);
            }
            return;
          } catch {
            // try next fallback
          }
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
      return undefined;
    })
  );
});
