// Handler Web Push. PUBLIK (customer tanpa auth); scoping via ticket_id (UUID).
import type { Context } from "hono";
import { ok } from "../lib/response.ts";
import { pushService } from "./push.service.ts";
import { pushEnabled } from "./push.sender.ts";

export async function subscribePush(c: Context) {
  const ticketId = c.req.param("id")!;
  const { endpoint, keys } = c.req.valid("json" as never) as {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  };
  await pushService.subscribe(ticketId, {
    endpoint,
    p256dh: keys.p256dh,
    auth: keys.auth,
  });
  return ok(c, { subscribed: true }, 201);
}

// Public key VAPID untuk customer app (alternatif dari env build-time).
// enabled=false → server tak punya VAPID → client sembunyikan tombol push.
export function vapidPublicKey(c: Context) {
  return ok(c, {
    enabled: pushEnabled,
    publicKey: pushEnabled ? process.env.VAPID_PUBLIC_KEY ?? null : null,
  });
}
