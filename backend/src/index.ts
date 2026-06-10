// Entry backend: Bun.serve menggabungkan HTTP (Hono) + upgrade WebSocket /ws.
// WS masih stub struktur; pub/sub realtime dikerjakan di modul Monitor+TV.
import { app } from "./app.ts";
import { env } from "./lib/env.ts";
import { setPublisher } from "./ws/broadcast.ts";
import { websocket } from "./ws/handlers.ts";
import { setPushHandlers } from "./push/push.notify.ts";
import { pushService } from "./push/push.service.ts";
import { pushEnabled } from "./push/push.sender.ts";

const server = Bun.serve({
  port: env.port,
  fetch(req, server) {
    const url = new URL(req.url);
    if (url.pathname === "/ws") {
      const ok = server.upgrade(req);
      return ok ? undefined : new Response("WebSocket upgrade gagal", { status: 400 });
    }
    return app.fetch(req, server);
  },
  websocket,
});

// Hubungkan broadcast → Bun WebSocket publish (topic pub/sub).
setPublisher((topic, data) => server.publish(topic, JSON.stringify(data)));

// Pasang implementasi notifikasi push (fire-and-forget; gagal push tak boleh
// menggagalkan aksi operator → semua error ditelan + dicatat).
setPushHandlers({
  ticketCalled: (t) =>
    void pushService
      .notifyReady(t)
      .catch((e) => console.error("notifyReady gagal:", e)),
  queueAdvanced: (platformId) =>
    void pushService
      .notifyRemindThree(platformId)
      .catch((e) => console.error("notifyRemindThree gagal:", e)),
});

console.log(`API jalan di http://localhost:${server.port}`);
console.log(`Web Push: ${pushEnabled ? "aktif" : "nonaktif (VAPID kosong)"}`);
