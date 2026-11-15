/* El trabajador solamente guarda archivos públicos de SHALOM Offline.
   No intercepta el administrador ni almacena respuestas privadas de Supabase. */
const VERSION = "shalom-offline-shell-v1";
const ASSETS = [
  "./offline.html",
  "./offline.css",
  "./offline.js",
  "./song-chords.js",
  "./favicon.svg",
  "./site.webmanifest"
];
const ASSET_PATHS = new Set(ASSETS.map((path) => new URL(path, self.registration.scope).pathname));
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(VERSION)
    .then((cache) => cache.addAll(ASSETS))
    .then(() => self.skipWaiting()));
});
self.addEventListener("activate", (event) => {
  event.waitUntil(Promise.all([
    caches.keys().then((keys) => Promise.all(keys
      .filter((key) => key.startsWith("shalom-offline-shell-") && key !== VERSION)
      .map((key) => caches.delete(key)))),
    self.clients.claim()
  ]));
});
self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;
  const url = new URL(request.url);
  if (!ASSET_PATHS.has(url.pathname)) return;
  event.respondWith(caches.open(VERSION).then(async (cache) => {
    const saved = await cache.match(request, { ignoreSearch: true });
    if (saved) return saved;
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  }));
});
