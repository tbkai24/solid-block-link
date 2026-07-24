const CACHE_NAME = "sblink-cache-v1";
const ASSETS_TO_CACHE = [
  "/",
  "/manifest.webmanifest",
  "/sbllogo.jpg",
  "/favicon.svg"
];

// Service Worker Install
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Service Worker Activate
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Intercept (Stale-While-Revalidate fallback)
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Skip API requests and external scripts from cache-first
  if (url.pathname.startsWith("/api") || url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === "basic") {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
        }
        return networkResponse;
      }).catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});

// Push Notification Event (Native Mobile & Laptop Push Notifications)
self.addEventListener("push", (event) => {
  let data = {
    title: "SBLink Drive Update",
    body: "New campaign updates and donation records available!",
    icon: "/sbllogo.jpg",
    badge: "/sbllogo.jpg",
    data: { url: "/" }
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || "/sbllogo.jpg",
    badge: data.badge || "/sbllogo.jpg",
    image: data.image || undefined,
    data: data.data || { url: "/" },
    vibrate: [100, 50, 100],
    actions: data.actions || [
      { action: "open", title: "View Drive" },
      { action: "dismiss", title: "Dismiss" }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification Click Handler
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") return;

  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
