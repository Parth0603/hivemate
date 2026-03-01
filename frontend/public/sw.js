// Service Worker for HiveMate
const CACHE_NAME = 'hivemate-v1';
const STATIC_CACHE = 'hivemate-static-v1';
const DYNAMIC_CACHE = 'hivemate-dynamic-v1';

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
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

// Fetch event - serve from cache, fallback to network
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

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request).then((response) => {
        // Don't cache non-successful responses
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }

        // Clone the response
        const responseToCache = response.clone();

        // Cache dynamic content
        caches.open(DYNAMIC_CACHE).then((cache) => {
          cache.put(request, responseToCache);
        });

        return response;
      }).catch(() => {
        // Return offline page if available
        return caches.match('/index.html');
      });
    })
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
