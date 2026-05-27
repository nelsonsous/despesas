const CACHE_NAME = 'despesas-v182';
const ASSETS = [
    '/despesas/',
    '/despesas/index.html',
    '/despesas/styles.css?v=182',
    '/despesas/app.js?v=182',
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
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache =>
            Promise.all(ASSETS.map(a => fetch(a, { cache: 'no-store' }).then(r => cache.put(a, r))))
        )
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        ).then(() => self.clients.claim())
          .then(() => self.clients.matchAll({ type: 'window' }))
          .then(clients => clients.forEach(c => c.navigate(c.url)))
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(freshRequest(event.request))
            .then(response => {
                const clone = response.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                return response;
            })
            .catch(() => caches.match(event.request))
    );
});
