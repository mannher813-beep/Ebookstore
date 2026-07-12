// Service Worker for EbookStore Recrutement
const CACHE_NAME = "recrutement-v1";
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/icon.svg",
  "/manifest.json"
];

// Install Event
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Caching app shell and core assets");
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log("[Service Worker] Clearing old cache:", cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event
self.addEventListener("fetch", (event) => {
  // Let browser make standard network requests, and fall back to cache if offline
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // If successful, cache a clone of the response for future offline use
        if (response.status === 200 && event.request.url.startsWith(self.location.origin)) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Fallback to cache on network failure
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // If accessing a job detail view, serve index.html for SPA support
          if (event.request.url.includes("/job/")) {
            return caches.match("/index.html") || caches.match("/");
          }
        });
      })
  );
});

// Push Event
self.addEventListener("push", (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    console.log("[Service Worker] Push notification received:", data);

    const title = data.title || data.titre || "Nouvelle Offre d'Emploi !";
    const body = data.body || data.description || "Une nouvelle opportunité d'emploi vient d'être publiée !";
    const image = data.image || "/icon.svg";
    const slug = data.slug || null;
    const url = data.url || (slug ? `/job/${slug}` : "/");

    const options = {
      body: body,
      icon: "/icon.svg",
      image: image,
      badge: "/icon.svg",
      vibrate: [100, 50, 100],
      data: { url: url }
    };

    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  } catch (err) {
    console.error("[Service Worker] Error parsing push data:", err);
    // Fallback simple text notification
    const text = event.data.text();
    event.waitUntil(
      self.registration.showNotification("EbookStore Recrutement", {
        body: text,
        icon: "/icon.svg",
        badge: "/icon.svg",
        data: { url: "/" }
      })
    );
  }
});

// Notification Click Event
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      // Find if there is already a window open with this URL and focus it
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        const clientUrl = new URL(client.url).pathname + new URL(client.url).search;
        if ((clientUrl === targetUrl || client.url.includes(targetUrl)) && "focus" in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
