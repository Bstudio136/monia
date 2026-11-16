const CACHE_NAME = 'b-ai-chat-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg'
];

// Installation du Service Worker et mise en cache des fichiers de base
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// Nettoyage des anciens caches si tu mets à jour l'application
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
    })
  );
  self.clients.claim();
});

// Gestion des requêtes réseau :
// Si c'est un fichier de l'app (HTML/CSS/JS/CDN), on prend le cache si hors-ligne.
// Si c'est une requete API (Puter, OpenRouter...), on laisse passer directement sur internet.
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // On ne met PAS en cache les appels API
  if (url.origin !== location.origin && !url.hostname.includes('cdnjs') && !url.hostname.includes('jsdelivr')) {
    return;
  }

  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        // En arrière plan, on rafraîchit le cache
        fetch(e.request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, networkResponse));
          }
        }).catch(() => {});
        return cachedResponse;
      }
      return fetch(e.request);
    })
  );
});
