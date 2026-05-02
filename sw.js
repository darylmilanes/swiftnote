const CACHE_NAME = 'swiftnote-cache-v1';
const ASSETS = [
  './index.html',
  './manifest.json',
  './favicon.png',
  './icon-192.png',
  './icon-512.png'
];

// Install Event - Pre-cache essential assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate Event - Clean up old caches if the version changes
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event - Network First Strategy with Offline Fallback
// This ensures the zero-latency experience is preserved even if the user drops into a subway/tunnel.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // EXCLUDE Firebase and Firestore APIs from being intercepted and cached by the Service Worker
  // This allows real-time WebSockets and long-polling to function normally
  if (url.hostname.includes('googleapis.com') || url.hostname.includes('gstatic.com') || url.hostname.includes('firebase')) {
    return; 
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Only update cache for successful GET requests
        if (event.request.method === 'GET' && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
        }
        return response;
      })
      .catch(() => {
        // Fallback to cache if network is unavailable
        return caches.match(event.request);
      })
  );
});
