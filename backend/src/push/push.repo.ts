// Repo Web Push: simpan subscription + ambil target untuk kirim notifikasi.
// Subscribe PUBLIK (customer tanpa JWT); scoping-nya ticket_id (UUID) dari URL.
import { sql } from "../db/client.ts";
import { wibDay } from "../tickets/ticket.label.ts";
import type { PushTarget } from "./push.sender.ts";

export type TargetRow = PushTarget & {
  ticket_id: string;
  label: string;
  platform_name: string;
};

export interface PushRepo {
  ticketExists(ticketId: string): Promise<boolean>;
  saveSubscription(ticketId: string, t: PushTarget): Promise<void>;
  removeTarget(ticketId: string, endpoint: string): Promise<void>;
  targetsForTicket(ticketId: string): Promise<PushTarget[]>;
  // Idempoten + anti-balapan: klaim tiket WAITING di platform yang posisinya
  // ≤ 3 dan belum di-reminder (set reminded_3=true sekaligus), lalu kembalikan
  // target push-nya. Hanya satu pemanggil yang akan mendapat baris (RETURNING).
  claimRemindThree(platformId: string): Promise<TargetRow[]>;
}

export const pushRepo: PushRepo = {
  async ticketExists(ticketId) {
    const rows = await sql`SELECT 1 FROM tickets WHERE id = ${ticketId}`;
    return rows.length > 0;
  },

  async saveSubscription(ticketId, t) {
    await sql`
      INSERT INTO push_subscriptions (ticket_id, endpoint, p256dh, auth)
      VALUES (${ticketId}, ${t.endpoint}, ${t.p256dh}, ${t.auth})
      ON CONFLICT (ticket_id, endpoint)
      DO UPDATE SET p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth
    `;
  },

  async removeTarget(ticketId, endpoint) {
    await sql`
      DELETE FROM push_subscriptions
      WHERE ticket_id = ${ticketId} AND endpoint = ${endpoint}
    `;
  },

  async targetsForTicket(ticketId) {
    return sql<PushTarget[]>`
      SELECT endpoint, p256dh, auth FROM push_subscriptions
      WHERE ticket_id = ${ticketId}
    `;
  },

  async claimRemindThree(platformId) {
    const day = wibDay();
    const claimed = await sql<{ id: string }[]>`
      WITH waiting AS (
        SELECT id, reminded_3,
               row_number() OVER (ORDER BY number) - 1 AS ahead
        FROM tickets
        WHERE platform_id = ${platformId}
          AND booking_day = ${day}
          AND status = 'WAITING'
      )
      UPDATE tickets SET reminded_3 = true
      WHERE id IN (SELECT id FROM waiting WHERE ahead <= 3 AND reminded_3 = false)
      RETURNING id
    `;
    if (claimed.length === 0) return [];
    const ids = claimed.map((r) => r.id);
    return sql<TargetRow[]>`
      SELECT ps.ticket_id, ps.endpoint, ps.p256dh, ps.auth,
             t.label, pl.name AS platform_name
      FROM push_subscriptions ps
      JOIN tickets t ON t.id = ps.ticket_id
      JOIN platforms pl ON pl.id = t.platform_id
      WHERE ps.ticket_id IN ${sql(ids)}
    `;
  },
};
