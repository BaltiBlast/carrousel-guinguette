self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {};

  try {
    payload = event.data?.json() || {};
  } catch {
    payload = { title: "Le Carrousel", body: event.data?.text() || "Vous avez une nouvelle notification." };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || "Le Carrousel", {
      body: payload.body || "",
      icon: payload.icon || "/assets/icons/icon-192.png",
      badge: payload.badge || "/assets/icons/favicon-32.png",
      tag: payload.tag,
      data: { url: payload.url || "/admin/tableau-de-bord" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || "/admin/tableau-de-bord", self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (windowClients) => {
      for (const client of windowClients) {
        if ("navigate" in client) await client.navigate(targetUrl);
        return client.focus();
      }

      return self.clients.openWindow(targetUrl);
    }),
  );
});
