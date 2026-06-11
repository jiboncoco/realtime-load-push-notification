// Repo Queue Engine — Booking & Auto-assign (TDD §4.1/§4.3).
// Booking PUBLIK (per outlet), bukan per client_id: customer tak punya JWT,
// scoping-nya outlet_id dari URL.
import { sql } from "../db/client.ts";
import { Errors } from "../lib/response.ts";
import { formatLabel, wibDay } from "./ticket.label.ts";
import { computeOpen, wibNowParts, type DayHours } from "../outlets/outlet.status.ts";

export type TicketStatusValue =
  | "WAITING"
  | "CALLED"
  | "SERVING"
  | "COMPLETED"
  | "SKIPPED";

export type PlatformBrief = { id: string; code: string; name: string };

export type Ticket = {
  id: string;
  outlet_id: string;
  platform_id: string;
  number: number;
  label: string;
  status: TicketStatusValue;
  created_at: string;
};

export type TicketWithPlatform = Ticket & { platform: PlatformBrief };
export type TicketStatusView = TicketWithPlatform & { ahead: number };

export interface TicketRepo {
  book(outletId: string, deviceToken: string | null): Promise<TicketWithPlatform>;
  getView(ticketId: string): Promise<TicketStatusView | null>;
}

export const ticketRepo: TicketRepo = {
  async book(outletId, deviceToken) {
    const day = wibDay();
    return sql.begin(async (tx) => {
      // 1) Serialize booking per-outlet (auto-release di akhir transaksi).
      await tx`SELECT pg_advisory_xact_lock(hashtext(${outletId}))`;

      // Pastikan outlet ada + ambil status terima antrian.
      const [outlet] = await tx<{ id: string; accepting: boolean }[]>`
        SELECT id, accepting FROM outlets WHERE id = ${outletId}
      `;
      if (!outlet) throw Errors.notFound("Outlet");

      // Guard buka/tutup: tolak booking bila di luar jam / ditutup manual.
      const { weekday } = wibNowParts();
      const todayHours = await tx<DayHours[]>`
        SELECT weekday, is_closed,
               to_char(open_time, 'HH24:MI:SS')  AS open_time,
               to_char(close_time, 'HH24:MI:SS') AS close_time
        FROM outlet_hours WHERE outlet_id = ${outletId} AND weekday = ${weekday}
      `;
      if (!computeOpen(outlet.accepting, todayHours).open) {
        throw Errors.conflict(
          "OUTLET_CLOSED",
          "Outlet sedang tutup, antrian tidak bisa diambil.",
        );
      }

      // 2) Platform WAITING paling sedikit, tie-break code ASC.
      const [platform] = await tx<PlatformBrief[]>`
        SELECT p.id, p.code, p.name
        FROM platforms p
        LEFT JOIN tickets t ON t.platform_id = p.id AND t.status = 'WAITING'
        WHERE p.outlet_id = ${outletId}
        GROUP BY p.id
        ORDER BY COUNT(t.id) ASC, p.code ASC
        LIMIT 1
      `;
      if (!platform) {
        throw Errors.conflict("NO_PLATFORM", "Outlet belum punya platform.");
      }

      // 3) Nomor berikutnya untuk (platform, hari ini WIB).
      const [next] = await tx<{ next: number }[]>`
        SELECT COALESCE(MAX(number), 0) + 1 AS next
        FROM tickets
        WHERE platform_id = ${platform.id} AND booking_day = ${day}
      `;
      const number = Number(next!.next);
      const label = formatLabel(platform.code, number);

      // 4) Insert tiket WAITING.
      const [ticket] = await tx<Ticket[]>`
        INSERT INTO tickets
          (outlet_id, platform_id, number, label, status, device_token, booking_day)
        VALUES
          (${outletId}, ${platform.id}, ${number}, ${label}, 'WAITING', ${deviceToken}, ${day})
        RETURNING id, outlet_id, platform_id, number, label, status, created_at
      `;
      return { ...ticket!, platform };
    });
  },

  async getView(ticketId) {
    const [row] = await sql<
      (Ticket & {
        booking_day: string;
        platform_code: string;
        platform_name: string;
      })[]
    >`
      SELECT t.id, t.outlet_id, t.platform_id, t.number, t.label, t.status,
             t.created_at, t.booking_day,
             p.code AS platform_code, p.name AS platform_name
      FROM tickets t
      JOIN platforms p ON p.id = t.platform_id
      WHERE t.id = ${ticketId}
    `;
    if (!row) return null;

    // Sisa di depan (TDD §4.3): WAITING di platform sama, hari sama, nomor lebih kecil.
    const [ahead] = await sql<{ ahead: number }[]>`
      SELECT COUNT(*) AS ahead FROM tickets
      WHERE platform_id = ${row.platform_id}
        AND status = 'WAITING'
        AND booking_day = ${row.booking_day}
        AND number < ${row.number}
    `;

    const { booking_day, platform_code, platform_name, ...ticket } = row;
    return {
      ...ticket,
      platform: { id: row.platform_id, code: platform_code, name: platform_name },
      ahead: Number(ahead!.ahead),
    };
  },
};
