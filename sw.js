/**
 * sw.js — Service Worker for Matamoro's Wedding Photo Booth
 * Enables PWA install (standalone mode = no browser chrome).
 * Cache-first for static assets; network-first for everything else.
 */

const CACHE_NAME = 'photobooth-v1';
const STATIC_ASSETS = [
    './',
    './index.html',
    './styles.css',
    './app.js',
    './manifest.webmanifest',
    './icons/icon-192.png',
    './icons/icon-512.png'
];

/* ── Install: pre-cache shell ─────────────────────────────────────────── */
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(STATIC_ASSETS))
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

/* ── Fetch: cache-first for static, network-first for the rest ────────── */
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // Only handle same-origin requests
    if (url.origin !== location.origin) return;

    event.respondWith(
        caches.match(event.request).then(cached => {
            // Return cached version while fetching update in background
            const fetchPromise = fetch(event.request).then(response => {
                if (response && response.status === 200) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                }
                return response;
            }).catch(() => cached);

            return cached || fetchPromise;
        })
    );
});
