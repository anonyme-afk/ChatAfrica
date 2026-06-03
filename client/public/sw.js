// Service Worker — ChatAfrica
// Cache les assets statiques pour fonctionner offline/connexion lente

const CACHE_NAME = 'chatafrica-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  // Les autres assets sont ajoutés dynamiquement
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // Ne cache pas Socket.io ni les API calls
  if (e.request.url.includes('socket.io') || e.request.url.includes('/api/')) {
    return fetch(e.request);
  }

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        // Cache les nouvelles ressources statiques
        if (response.status === 200 && e.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => cached || new Response('Offline', { status: 503 }));
    })
  );
});
