const CACHE_NAME = 'kerem-vines-v14';
const ASSETS = [
  './',
  './index.html',
  './script.js',
  './script.js?v=12',
  './assets/sentence-levels.js?v=1',
  './assets/fonts/alef-hebrew-400.woff2',
  './assets/fonts/alef-hebrew-700.woff2',
  './assets/fonts/OFL-Alef.txt',
  './assets/sentence-art/dad-strawberry-home.webp',
  './assets/sentence-art/dad-green-strawberry.webp',
  './assets/sentence-art/mom-sweet-strawberry-sea.webp',
  './assets/sentence-art/baby-strawberry-nap.webp',
  './assets/sentence-art/boy-pink-horse.webp',
  './assets/sentence-art/girl-banana-field.webp',
  './assets/sentence-art/sent-001.webp',
  './assets/sentence-art/sent-002.webp',
  './assets/sentence-art/sent-003.webp',
  './assets/sentence-art/sent-004.webp',
  './assets/sentence-art/sent-005.webp',
  './assets/sentence-art/sent-006.webp',
  './assets/sentence-art/sent-007.webp',
  './assets/sentence-art/sent-008.webp',
  './assets/sentence-art/sent-009.webp',
  './assets/sentence-art/sent-010.webp',
  './assets/sentence-art/sent-011.webp',
  './assets/sentence-art/sent-012.webp',
  './assets/sentence-art/sent-013.webp',
  './assets/sentence-art/sent-014.webp',
  './assets/sentence-art/sent-015.webp',
  './assets/sentence-art/sent-016.webp',
  './assets/sentence-art/sent-017.webp',
  './assets/sentence-art/sent-018.webp',
  './assets/sentence-art/sent-019.webp',
  './assets/sentence-art/sent-020.webp',
  './assets/sentence-art/sent-021.webp',
  './assets/sentence-art/sent-022.webp',
  './assets/sentence-art/sent-023.webp',
  './assets/sentence-art/sent-024.webp',
  './assets/sentence-art/sent-025.webp',
  './assets/sentence-art/sent-026.webp',
  './assets/sentence-art/sent-027.webp',
  './assets/sentence-art/sent-028.webp',
  './assets/sentence-art/sent-029.webp',
  './assets/sentence-art/sent-030.webp',
  './assets/sentence-art/sent-031.webp',
  './assets/sentence-art/sent-032.webp',
  './assets/sentence-art/sent-033.webp',
  './assets/sentence-art/sent-034.webp',
  './assets/sentence-art/sent-035.webp',
  './assets/sentence-art/sent-036.webp',
  './assets/sentence-art/sent-037.webp',
  './manifest.webmanifest',
  './icon.svg',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png',
  './README.md',
  './THIRD_PARTY.md'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) {
    event.respondWith(fetch(event.request));
    return;
  }
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.match('./index.html')));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});
