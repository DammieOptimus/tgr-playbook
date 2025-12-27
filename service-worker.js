const CACHE_NAME = 'tgr-playbook-v2';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './instructions.json',
    './manifest.json',
    './favicon.ico',
    './android-chrome-192x192.png',
    './android-chrome-512x512.png'
];

// 1. INSTALL EVENT: Runs once when the user first visits.
// It downloads and saves all the files listed above.
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('Opened cache');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

// 2. FETCH EVENT: Runs every time the app needs a file.
// It checks the cache first. If the file is there, it serves it from the phone (Offline mode!).
// If not, it goes to the internet to get it.
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            // Cache hit - return response from phone storage
            if (response) {
                return response;
            }
            // Not in cache - fetch from internet
            return fetch(event.request);
        })
    );
});

// 3. ACTIVATE EVENT: Cleans up old caches when you update the app.
self.addEventListener('activate', (event) => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});