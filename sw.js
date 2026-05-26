const CACHE_NAME = 'despesas-v168';
const ASSETS = [
    '/despesas/',
    '/despesas/index.html',
    '/despesas/styles.css?v=168',
    '/despesas/app.js?v=168',
    '/despesas/manifest.json'
];

// Force fresh fetch of the app shell so HTTP cache (browser layer) cannot
// hand us a stale app.js / index.html. GitHub Pages may set Cache-Control
// headers that survive a SW update otherwise.
function freshRequest(req) {
    if (req.method !== 'GET') return req;
    const url = new URL(req.url);
    // Only bypass HTTP cache for our own app shell — third-party CDNs
    // (Font Awesome, Google Fonts, pdf.js) break with no-store + no-cors.
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
    // Handle Web Share Target POST: store the shared file in IndexedDB
    // then redirect to the app so it can pick it up on load.
    if (event.request.method === 'POST' && new URL(event.request.url).pathname === '/despesas/') {
        event.respondWith((async () => {
            const formData = await event.request.formData();
            const file = formData.get('receipt');
            if (file && file instanceof File) {
                const buf = await file.arrayBuffer();
                await new Promise((resolve, reject) => {
                    const req = indexedDB.open('despesas-share', 1);
                    req.onupgradeneeded = e => e.target.result.createObjectStore('pending');
                    req.onsuccess = e => {
                        const tx = e.target.result.transaction('pending', 'readwrite');
                        tx.objectStore('pending').put({ name: file.name, type: file.type, buf }, 'latest');
                        tx.oncomplete = resolve;
                        tx.onerror = reject;
                    };
                    req.onerror = reject;
                });
            }
            return Response.redirect('/despesas/?share=1', 303);
        })());
        return;
    }
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
