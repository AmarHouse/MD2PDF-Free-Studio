/* ============================================
   SW.JS - Service Worker com Cache Inteligente
   ============================================ */

const CACHE_VERSION = 'v2';
const CACHE_NAME = `md2pdf-${CACHE_VERSION}`;
const CACHE_CDN = `md2pdf-cdn-${CACHE_VERSION}`;

// Assets locais para cache offline
const LOCAL_ASSETS = [
    './',
    './index.html',
    './css/main.css',
    './css/editor.css',
    './css/preview.css',
    './css/modals.css',
    './css/print.css',
    './css/pix.css',
    './js/i18n.js',
    './js/storage.js',
    './js/themes.js',
    './js/preview.js',
    './js/find-replace.js',
    './js/stats.js',
    './js/image-manager.js',
    './js/templates.js',
    './js/theme-editor.js',
    './js/pdf-generator.js',
    './js/pix.js',
    './js/epub-generator.js',
    './js/editor.js',
    './js/app.js',
    './manifest.json'
];

// CDN assets para cache com stale-while-revalidate
const CDN_ASSETS = [
    'https://cdnjs.cloudflare.com/ajax/libs/marked/9.1.2/marked.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Install - pre-cache local assets
self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(LOCAL_ASSETS);
        }).then(() => self.skipWaiting())
    );
});

// Activate - clean old caches
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME && key !== CACHE_CDN)
                    .map(key => caches.delete(key))
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch strategies
self.addEventListener('fetch', (e) => {
    const { request } = e;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') return;

    // CDN assets: Stale-While-Revalidate
    if (url.hostname === 'cdnjs.cloudflare.com' ||
        url.hostname === 'fonts.googleapis.com' ||
        url.hostname === 'fonts.gstatic.com') {
        e.respondWith(staleWhileRevalidate(request, CACHE_CDN));
        return;
    }

    // Local assets: Cache First
    if (url.origin === self.location.origin) {
        e.respondWith(cacheFirst(request, CACHE_NAME));
        return;
    }

    // External images: Network First with cache fallback
    if (request.destination === 'image') {
        e.respondWith(networkFirst(request, CACHE_NAME));
        return;
    }

    // Default: Network first
    e.respondWith(networkFirst(request, CACHE_NAME));
});

// Strategy: Cache First (for local assets)
async function cacheFirst(request, cacheName) {
    const cached = await caches.match(request);
    if (cached) return cached;
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, response.clone());
        }
        return response;
    } catch {
        return new Response('Offline', { status: 503 });
    }
}

// Strategy: Stale While Revalidate (for CDN)
async function staleWhileRevalidate(request, cacheName) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);

    const fetchPromise = fetch(request).then(response => {
        if (response.ok) {
            cache.put(request, response.clone());
        }
        return response;
    }).catch(() => cached);

    return cached || fetchPromise;
}

// Strategy: Network First (for dynamic content)
async function networkFirst(request, cacheName) {
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, response.clone());
        }
        return response;
    } catch {
        const cached = await caches.match(request);
        return cached || new Response('Offline', { status: 503 });
    }
}

// Listen for messages from main thread
self.addEventListener('message', (e) => {
    if (e.data === 'skipWaiting') {
        self.skipWaiting();
    }
});
