const CACHE = "durak-static-v1";

// Cache Next.js static chunks and images on fetch.
const STATIC_PATTERNS = [
  /^\/_next\/static\//,
  /^\/_next\/image\//,
  /^\/icons\//,
  /^\/favicon\.ico$/,
];

function isStatic(url) {
  const path = new URL(url).pathname;
  return STATIC_PATTERNS.some((re) => re.test(path));
}

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (!isStatic(event.request.url)) return;

  // Cache-first for static assets.
  event.respondWith(
    caches.match(event.request).then(
      (cached) =>
        cached ??
        fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE).then((cache) => cache.put(event.request, clone));
          }
          return response;
        }),
    ),
  );
});
