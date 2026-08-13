// Service Worker untuk Laporan Gitajatin Intermedia PWA
// Version 1.0 - Offline Support & Caching

const CACHE_NAME = 'laporan-gti-v1';
const RUNTIME_CACHE = 'laporan-gti-runtime-v1';

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'
];

// Install event - cache assets
self.addEventListener('install', event => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Caching app shell');
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        console.log('Cache addAll error (some URLs might not be available):', err);
        // Ini normal jika beberapa external resources tidak bisa di-cache
        return Promise.resolve();
      });
    })
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', event => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(cacheName => cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE)
          .map(cacheName => {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - offline-first strategy
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // For HTML pages - Network first, then cache
  if (request.method === 'GET' && request.headers.get('accept').includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Clone dan cache response
          const clonedResponse = response.clone();
          caches.open(RUNTIME_CACHE).then(cache => {
            cache.put(request, clonedResponse);
          });
          return response;
        })
        .catch(() => {
          // Fallback ke cache jika offline
          return caches.match(request).then(cached => {
            return cached || createOfflineResponse();
          });
        })
    );
    return;
  }

  // For other assets - Cache first, then network
  event.respondWith(
    caches.match(request).then(cached => {
      return (
        cached ||
        fetch(request).then(response => {
          // Cache successful responses
          if (response && response.status === 200) {
            const clonedResponse = response.clone();
            caches.open(RUNTIME_CACHE).then(cache => {
              cache.put(request, clonedResponse);
            });
          }
          return response;
        })
      );
    }).catch(() => {
      // Return offline placeholder if needed
      return new Response('Offline - silakan cek koneksi internet', {
        status: 503,
        statusText: 'Service Unavailable',
        headers: new Headers({
          'Content-Type': 'text/plain'
        })
      });
    })
  );
});

// Create offline response
function createOfflineResponse() {
  return new Response(
    `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Offline - Laporan GAVAD</title>
      <style>
        body { font-family: system-ui, sans-serif; padding: 20px; color: #333; }
        .container { max-width: 500px; margin: 50px auto; text-align: center; }
        h1 { color: #0077c2; }
        p { font-size: 16px; line-height: 1.6; }
        .icon { font-size: 60px; margin-bottom: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">📡</div>
        <h1>Mode Offline</h1>
        <p>Anda sedang offline. Aplikasi akan menyimpan data di ponsel Anda dan sinkronkan saat terhubung internet.</p>
        <p style="color: #999; font-size: 14px; margin-top: 30px;">Laporan GAVAD v1.0</p>
      </div>
    </body>
    </html>
    `,
    {
      status: 503,
      statusText: 'Service Unavailable',
      headers: new Headers({
        'Content-Type': 'text/html; charset=utf-8'
      })
    }
  );
}

// Background sync untuk sync laporan nanti
self.addEventListener('sync', event => {
  if (event.tag === 'sync-laporan') {
    event.waitUntil(
      // Nanti bisa tambah logic untuk sync ke Google Sheets
      Promise.resolve()
    );
  }
});

// Push notification
self.addEventListener('push', event => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body || 'Laporan GAVAD Notification',
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect fill="%230077c2" width="192" height="192"/><text x="96" y="110" font-size="100" font-weight="bold" fill="white" text-anchor="middle">📋</text></svg>',
    badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72"><rect fill="%230077c2" width="72" height="72"/><text x="36" y="45" font-size="40" font-weight="bold" fill="white" text-anchor="middle">📋</text></svg>',
    tag: 'laporan-notification',
    requireInteraction: false
  };

  event.waitUntil(
    self.registration.showNotification('Laporan Gitajatin Intermedia', options)
  );
});

// Notification click
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      for (let client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

console.log('Service Worker loaded');
