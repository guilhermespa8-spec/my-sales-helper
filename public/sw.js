self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
      await self.registration.unregister();

      const clientsList = await self.clients.matchAll({ type: "window" });
      await Promise.all(clientsList.map((client) => client.navigate(client.url)));
    })()
  );
});