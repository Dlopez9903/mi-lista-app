const CACHE_NAME = 'todo-pwa-v4';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json'
];

// Instalación: Carga de archivos estáticos
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// Activación: Limpieza de cachés antiguas y toma de control activa
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

// Intercepción de red: Estrategia Stale-While-Revalidate con Fallback de navegación
self.addEventListener('fetch', (e) => {
  // Ignorar peticiones de Firebase Authentication y Firestore
  if (
    e.request.url.includes('firestore.googleapis.com') || 
    e.request.url.includes('identitytoolkit.googleapis.com') ||
    e.request.url.includes('securetoken.googleapis.com')
  ) {
    return;
  }

  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(e.request).catch(() => {
        // Si falla la red y el usuario intenta navegar a una página, entregar index.html
        if (e.request.mode === 'navigate') {
          return caches.match('./index.html') || caches.match('./');
        }
      });
    })
  );
});