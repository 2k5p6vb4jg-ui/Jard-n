// Service worker mínimo: permite instalar la app y, si el ordenador de la tienda está apagado o
// sin conexión, muestra un aviso claro en lugar del error del navegador. No guarda datos de pacientes.
const CACHE = "jardon-v1";
const OFFLINE = "/offline.html";

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.add(OFFLINE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.mode !== "navigate") return; // todo lo demás va directo a la red
  e.respondWith(fetch(e.request).catch(() => caches.match(OFFLINE)));
});
