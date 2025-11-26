// admin-sw.js - VERSIÓN CORREGIDA
const CACHE_NAME = 'admin-catalogo-cpsnoopy-v3';
const STATIC_URLS = [
  './',
  './index.html',
  './css/admin.css',
  './js/admin-auth.js',
  './js/admin-drive-config.js', 
  './js/admin-app.js',
  './js/load-google-api.js',
  './manifest.json'
];

self.addEventListener('install', event => {
  console.log('🔧 Service Worker: Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('✅ Cache abierto');
        // Agregar URLs una por una con manejo de errores
        return Promise.all(
          STATIC_URLS.map(url => {
            return cache.add(url).catch(err => {
              console.log(`⚠️ No se pudo cachear ${url}:`, err);
            });
          })
        );
      })
      .then(() => {
        console.log('✅ Todos los recursos cacheados');
        return self.skipWaiting();
      })
  );
});

self.addEventListener('activate', event => {
  console.log('🔧 Service Worker: Activando...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log(`🗑️ Eliminando cache viejo: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('✅ Service Worker activado');
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // NO cachear requests de extensiones de Chrome
  if (url.protocol === 'chrome-extension:') {
    return;
  }
  
  // NO cachear requests a Google APIs (causan problemas)
  if (url.href.includes('googleapis.com') || url.href.includes('gstatic.com')) {
    return;
  }
  
  // Solo cachear requests del mismo origen y HTTP/HTTPS
  if (url.origin !== self.location.origin || 
      (url.protocol !== 'http:' && url.protocol !== 'https:')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(cached => {
        // Para recursos estáticos, usar cache primero
        if (cached && isStaticAsset(event.request)) {
          return cached;
        }
        
        // Para otros recursos, network primero
        return fetch(event.request)
          .then(response => {
            // Solo cachear respuestas exitosas y del mismo origen
            if (response.status === 200 && url.origin === self.location.origin) {
              const responseClone = response.clone();
              caches.open(CACHE_NAME)
                .then(cache => cache.put(event.request, responseClone))
                .catch(err => console.log('⚠️ Error actualizando cache:', err));
            }
            return response;
          })
          .catch(() => {
            // Fallback a cache si está disponible
            return cached || new Response('Resource not available offline', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
      })
  );
});

// Función auxiliar para identificar recursos estáticos
function isStaticAsset(request) {
  return request.url.includes('/css/') || 
         request.url.includes('/js/') || 
         request.url.includes('/images/') ||
         request.url.endsWith('.html') ||
         request.url.endsWith('.json') ||
         request.url.endsWith('.js') ||
         request.url.endsWith('.css');
}