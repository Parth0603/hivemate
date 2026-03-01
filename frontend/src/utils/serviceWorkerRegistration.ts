let waitingServiceWorker: ServiceWorker | null = null;
let hasUpdateEventFired = false;

const dispatchUpdateAvailable = () => {
  if (hasUpdateEventFired) return;
  hasUpdateEventFired = true;
  window.dispatchEvent(new CustomEvent('hivemate:update-available'));
};

const trackWaitingWorker = (registration: ServiceWorkerRegistration) => {
  if (registration.waiting) {
    waitingServiceWorker = registration.waiting;
    dispatchUpdateAvailable();
  }
};

export function register() {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    const swUrl = '/sw.js';

    navigator.serviceWorker
      .register(swUrl)
      .then((registration) => {
        console.log('Service Worker registered:', registration);
        trackWaitingWorker(registration);

        setInterval(() => {
          registration.update();
        }, 30000);

        registration.onupdatefound = () => {
          const installingWorker = registration.installing;
          if (!installingWorker) return;

          installingWorker.onstatechange = () => {
            if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
              waitingServiceWorker = registration.waiting || installingWorker;
              dispatchUpdateAvailable();
            }
          };
        };
      })
      .catch((error) => {
        console.error('Service Worker registration failed:', error);
      });
  });
}

export function applyUpdate() {
  if (!('serviceWorker' in navigator)) return;
  if (!waitingServiceWorker) return;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  }, { once: true });

  waitingServiceWorker.postMessage({ type: 'SKIP_WAITING' });
}

export function unregister() {
  if (!('serviceWorker' in navigator)) return;

  navigator.serviceWorker
    .getRegistrations()
    .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
    .then(() => {
      if (!('caches' in window)) return;
      return caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))));
    })
    .catch((error) => {
      console.error('Service Worker unregistration failed:', error);
    });
}
