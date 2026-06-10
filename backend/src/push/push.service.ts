// Service Web Push: subscribe + dua notifikasi (CUS-6 "ready", CUS-5 "sisa 3").
// Repo di-inject agar bisa diuji tanpa DB. Pengiriman fire-and-forget aman:
// kegagalan satu endpoint tak menggagalkan yang lain; endpoint mati dibersihkan.
import { Errors } from "../lib/response.ts";
import { pushRepo, type PushRepo } from "./push.repo.ts";
import {
  sendPush,
  type PushTarget,
  type PushPayload,
  type SendResult,
} from "./push.sender.ts";

type Sender = (t: PushTarget, p: PushPayload) => Promise<SendResult>;

// sender di-inject (default: web-push asli) agar service bisa diuji tanpa jaringan.
export function createPushService(repo: PushRepo, send: Sender = sendPush) {
  // Kirim satu payload ke semua target sebuah tiket; hapus endpoint yang gone.
  async function fanout(
    ticketId: string,
    targets: PushTarget[],
    payload: PushPayload,
  ) {
    await Promise.all(
      targets.map(async (t) => {
        const res = await send(t, payload);
        if (!res.ok && res.gone) await repo.removeTarget(ticketId, t.endpoint);
      }),
    );
  }

  return {
    // POST /tickets/:id/push-subscribe — daftarkan endpoint browser untuk tiket.
    async subscribe(ticketId: string, target: PushTarget): Promise<void> {
      if (!(await repo.ticketExists(ticketId))) throw Errors.notFound("Tiket");
      await repo.saveSubscription(ticketId, target);
    },

    // CUS-6: operator memanggil tiket → "Giliran Anda".
    async notifyReady(ticket: {
      id: string;
      label: string;
      platformName: string;
    }): Promise<void> {
      const targets = await repo.targetsForTicket(ticket.id);
      if (targets.length === 0) return;
      await fanout(ticket.id, targets, {
        title: "Giliran Anda!",
        body: `Nomor ${ticket.label} — silakan menuju ${ticket.platformName}.`,
        url: `/t/${ticket.id}`,
        tag: `ticket-${ticket.id}`,
      });
    },

    // CUS-5: antrian platform maju → reminder ke tiket yang tersisa ≤ 3 di depan.
    // Idempoten via reminded_3 (di-klaim atomik di repo).
    async notifyRemindThree(platformId: string): Promise<void> {
      const rows = await repo.claimRemindThree(platformId);
      if (rows.length === 0) return;

      // Kelompokkan per tiket (satu tiket bisa punya banyak perangkat).
      const byTicket = new Map<string, typeof rows>();
      for (const r of rows) {
        const list = byTicket.get(r.ticket_id) ?? [];
        list.push(r);
        byTicket.set(r.ticket_id, list);
      }

      await Promise.all(
        [...byTicket.entries()].map(([ticketId, group]) =>
          fanout(ticketId, group, {
            title: "Sebentar lagi giliran Anda",
            body: `Nomor ${group[0]!.label} — tersisa 3 antrian di depan Anda (${group[0]!.platform_name}).`,
            url: `/t/${ticketId}`,
            tag: `ticket-${ticketId}`,
          }),
        ),
      );
    },
  };
}

export type PushService = ReturnType<typeof createPushService>;

export const pushService = createPushService(pushRepo);
