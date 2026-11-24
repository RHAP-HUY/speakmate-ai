const CACHE_NAME = 'speakmate-luminous-v9';
const PRECACHE_URLS = ['/', '/manifest.webmanifest', '/icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS).catch(() => undefined))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never cache private/authenticated API responses, OAuth callbacks, or the SW itself
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/auth/') ||
    url.pathname === '/sw.js' ||
    url.pathname.startsWith('/opengraph-image') ||
    url.pathname.startsWith('/twitter-image')
  ) {
    return;
  }

  // Network-first for HTML page navigations with offline shell fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok && response.type === 'basic') {
            const copy = response.clone();
            caches
              .open(CACHE_NAME)
              .then((cache) => cache.put(request, copy))
              .catch(() => undefined);
          }
          return response;
        })
        .catch(() =>
          caches
            .match(request)
            .then((cached) => cached || caches.match('/'))
            .then((res) => res || Response.error())
        )
    );
    return;
  }

  // Stale-while-revalidate for immutable Next.js static bundles and app icons
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname === '/icon.svg' ||
    url.pathname === '/manifest.webmanifest'
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const networkFetch = fetch(request)
          .then((response) => {
            if (response && response.ok && response.type === 'basic') {
              const copy = response.clone();
              caches
                .open(CACHE_NAME)
                .then((cache) => cache.put(request, copy))
                .catch(() => undefined);
            }
            return response;
          })
          .catch(() => cached || Response.error());

        return cached || networkFetch;
      })
    );
  }
});
