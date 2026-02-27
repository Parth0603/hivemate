/**
 * Service Worker Registration Utility
 * Handles registration and updates of the service worker.
 */

export function register() {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    const swUrl = '/sw.js';

    navigator.serviceWorker
      .register(swUrl)
      .then((registration) => {
        console.log('Service Worker registered:', registration);

        setInterval(() => {
          registration.update();
        }, 60000);

        registration.onupdatefound = () => {
          const installingWorker = registration.installing;
          if (!installingWorker) return;

          installingWorker.onstatechange = () => {
            if (installingWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                console.log('New content available, please refresh.');
                if (window.confirm('New version available! Reload to update?')) {
                  window.location.reload();
                }
              } else {
                console.log('Content cached for offline use.');
              }
            }
          };
        };
      })
      .catch((error) => {
        console.error('Service Worker registration failed:', error);
      });
  });
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
