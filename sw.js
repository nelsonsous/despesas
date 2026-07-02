const CACHE_NAME = 'despesas-v328';
const ASSETS = [
    '/despesas/',
    '/despesas/index.html',
    '/despesas/styles.css?v=309',
    '/despesas/app.js?v=328',
    '/despesas/manifest.json'
];

function freshRequest(req) {
    if (req.method !== 'GET') return req;
    const url = new URL(req.url);
    if (url.origin !== self.location.origin) return req;
    const isAppShell = /\.(html|js|css)$/.test(url.pathname) || url.pathname.endsWith('/');
    if (!isAppShell) return req;
    return new Request(req.url, { method: 'GET', cache: 'no-store', credentials: req.credentials });
}

self.addEventListener('install', (event) => {
    // allSettled + ok-guard: one transient fetch failure must not abort the
    // whole update, and a 404/500 must never be stored as a cached asset.
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache =>
            Promise.allSettled(ASSETS.map(a =>
                fetch(a, { cache: 'no-store' }).then(r => { if (r && r.ok) return cache.put(a, r); })
            ))
        )
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    // No forced client navigation here: claim() fires controllerchange in the
    // page, which reloads itself when safe (not mid-form).
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(freshRequest(event.request))
            .then(response => {
                if (response && response.ok) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                }
                return response;
            })
            .catch(() => caches.match(event.request))
    );
});
