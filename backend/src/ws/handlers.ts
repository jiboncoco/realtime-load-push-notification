// Handler WebSocket Bun (pub/sub). Client subscribe ke topic display:
//   {"subscribe":"outlet:<id>"}  → CMS monitor & TV
//   {"subscribe":"ticket:<id>"}  → customer
// Subscribe PUBLIK (data display memang publik; ticket id = UUID tak tertebak).
// Mutasi (call/skip) tetap butuh auth via REST. Pesan event hanya jadi sinyal
// "ada perubahan" — client lalu refetch snapshot (sederhana & konsisten).
import type { ServerWebSocket, WebSocketHandler } from "bun";

const TOPIC_RE = /^(outlet|ticket):[0-9a-fA-F-]{8,}$/;

type Incoming = { subscribe?: string; unsubscribe?: string };

export const websocket: WebSocketHandler<undefined> = {
  open(ws: ServerWebSocket) {
    ws.send(JSON.stringify({ type: "hello" }));
  },

  message(ws: ServerWebSocket, raw: string | Buffer) {
    let msg: Incoming;
    try {
      msg = JSON.parse(typeof raw === "string" ? raw : raw.toString());
    } catch {
      return;
    }
    if (typeof msg.subscribe === "string" && TOPIC_RE.test(msg.subscribe)) {
      ws.subscribe(msg.subscribe);
      ws.send(JSON.stringify({ type: "subscribed", topic: msg.subscribe }));
    } else if (typeof msg.unsubscribe === "string") {
      ws.unsubscribe(msg.unsubscribe);
    }
  },

  close() {
    // Bun otomatis meng-unsubscribe semua topic saat koneksi tutup.
  },
};
