/* Linkly service worker — app-shell caching.
   Bump CACHE to force a fresh cache after deploys. */
const CACHE = 'linkly-v1';
const PRECACHE = [
    '/',
    '/shared.css',
    '/shared.js',
    '/home.css',
    '/dashboard.css',
    '/mobile.css',
    '/favicon.svg',
    '/manifest.json'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const request = event.request;
    if (request.method !== 'GET') return;
    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return; // external: fonts, gstatic, GSI…
    if (url.pathname.indexOf('/api/') === 0) return; // API always hits the network

    if (request.mode === 'navigate') {
        // Network-first for pages with a cache fallback; never cache redirected
        // responses so short-link hops (302 off-site) pass straight through.
        event.respondWith(
            fetch(request)
                .then((response) => {
                    if (response && response.ok && !response.redirected) {
                        const copy = response.clone();
                        caches.open(CACHE).then((cache) => cache.put(request, copy));
                    }
                    return response;
                })
                .catch(() => caches.match(request).then((hit) => hit || caches.match('/')))
        );
        return;
    }

    // Static assets: cache-first, refreshed in the background (stale-while-revalidate).
    event.respondWith(
        caches.match(request).then((hit) => {
            if (hit) {
                fetch(request).then((response) => {
                    if (response && response.ok && !response.redirected) {
                        const copy = response.clone();
                        caches.open(CACHE).then((cache) => cache.put(request, copy));
                    }
                }).catch(() => {});
                return hit;
            }
            return fetch(request).then((response) => {
                if (response && response.ok && !response.redirected) {
                    const copy = response.clone();
                    caches.open(CACHE).then((cache) => cache.put(request, copy));
                }
                return response;
            });
        })
    );
});
