const CACHE_NAME = 'presupuestos-cache-v3.9-standard';

const urlsToCache = [
    './',
    './index.html',
    './manifest.json',
    'https://cdn.tailwindcss.com',
    'https://unpkg.com/@phosphor-icons/web',
    'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap'
];

self.addEventListener('install', event => {
    // Forzar al SW a activarse inmediatamente
    self.skipWaiting();
    
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('Abriendo caché');
            // Intentamos cachear todo, pero no bloqueamos si uno falla
            return Promise.all(
                urlsToCache.map(url => {
                    return cache.add(url).catch(err => console.warn('No se pudo cachear:', url));
                })
            );
        })
    );
});

self.addEventListener('activate', event => {
    // Tomar control de los clientes (ventanas) inmediatamente
    event.waitUntil(self.clients.claim());

    // Limpiar cachés antiguas
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Borrando caché antigua:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // Estrategia para datos de Google Sheets: Network First (Red primero, fallback a nada)
    if (url.hostname.includes('docs.google.com')) {
        event.respondWith(
            fetch(event.request).catch(() => {
                // Si falla la red, podríamos devolver datos cacheados si implementáramos esa lógica,
                // pero por ahora devolvemos un error controlado.
                return new Response('Offline', { status: 503, statusText: 'Offline' });
            })
        );
        return;
    }

    // Estrategia para Assets (App Shell): Cache First, then Network
    event.respondWith(
        caches.match(event.request).then(response => {
            // Si está en caché, lo devolvemos
            if (response) {
                return response;
            }
            // Si no, vamos a la red
            return fetch(event.request);
        })
    );
});
