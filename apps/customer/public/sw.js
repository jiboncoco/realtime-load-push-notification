// Service Worker customer PWA — Web Push (modul Notifications).
// Backend mengirim payload JSON { title, body, url, tag }. SW menampilkan
// notifikasi; klik → fokus/buka halaman tiket.

self.addEventListener("install", () => {
  self.skipWaiting(); // SW baru langsung aktif (tanpa nunggu tab lama tutup).
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: "Antrian", body: event.data ? event.data.text() : "" };
  }
  const title = payload.title || "Antrian";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body || "",
      tag: payload.tag,
      renotify: Boolean(payload.tag),
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: payload.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        // Bila ada tab yang sudah membuka halaman tujuan, fokuskan saja.
        for (const client of clients) {
          if (client.url.endsWith(url) && "focus" in client) return client.focus();
        }
        return self.clients.openWindow(url);
      }),
  );
});
