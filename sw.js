/**
 * sw.js — Service Worker for Matamoro's Wedding Photo Booth
 * Enables PWA install (standalone mode = no browser chrome).
 * Cache-first for static assets y para las fuentes de Google; el resto pasa a la red.
 */

const CACHE_NAME = 'photobooth-v16';
const STATIC_ASSETS = [
    './',
    './index.html',
    './gallery.html',
    './assets/css/styles.css',
    './assets/js/app.js',
    './assets/js/config.js',
    './assets/js/gallery.js',
    './assets/js/qr.js',
    './manifest.webmanifest',
    './icons/icon-192.png',
    './icons/icon-512.png'
];

// Orígenes de las fuentes (CSS + archivos woff2). Se cachean en runtime: son
// inmutables y permiten que la tira conserve su tipografía sin conexión.
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

/* ── Install: pre-cache shell (tolerante a recursos faltantes) ─────────── */
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            // Cachear cada recurso por separado: un 404 puntual no aborta toda la instalación
            .then(cache => Promise.allSettled(
                STATIC_ASSETS.map(asset => cache.add(asset))
            ))
            .then(() => self.skipWaiting())
    );
});

/* ── Activate: clean old caches ───────────────────────────────────────── */
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
            )
        ).then(() => self.clients.claim())
    );
});

/* ── Fetch ────────────────────────────────────────────────────────────── */
self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;
    const url = new URL(event.request.url);

    // Fuentes de Google: cache-first (recursos inmutables y versionados)
    if (FONT_HOSTS.includes(url.hostname)) {
        event.respondWith(
            caches.match(event.request).then(cached => {
                if (cached) return cached;
                return fetch(event.request).then(response => {
                    if (response && (response.ok || response.type === 'opaque')) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                    }
                    return response;
                });
            })
        );
        return;
    }

    // Solo manejamos el resto si es del mismo origen
    if (url.origin !== location.origin) return;

    // Mismo origen: stale-while-revalidate
    event.respondWith(
        caches.match(event.request).then(cached => {
            const fetchPromise = fetch(event.request).then(response => {
                if (response && response.status === 200) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                }
                return response;
            }).catch(() => cached || Response.error());

            return cached || fetchPromise;
        })
    );
});
