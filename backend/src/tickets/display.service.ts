// Data layar TV (publik): per platform tampilkan nomor "sedang dipanggil"
// (CALLED/SERVING terbaru) + jumlah WAITING. Difilter hari ini (WIB).
import { sql } from "../db/client.ts";
import { Errors } from "../lib/response.ts";
import { wibDay } from "./ticket.label.ts";

export type DisplayPlatform = {
  id: string;
  code: string;
  name: string;
  current: { label: string; status: "CALLED" | "SERVING" } | null;
  waiting: number;
};

export type OutletDisplay = {
  outlet: { id: string; name: string };
  platforms: DisplayPlatform[];
};

export async function getOutletDisplay(outletId: string): Promise<OutletDisplay> {
  const [outlet] = await sql<{ id: string; name: string }[]>`
    SELECT id, name FROM outlets WHERE id = ${outletId}
  `;
  if (!outlet) throw Errors.notFound("Outlet");

  const day = wibDay();
  const rows = await sql<
    (Omit<DisplayPlatform, "waiting"> & { waiting: string })[]
  >`
    SELECT p.id, p.code, p.name,
      (
        SELECT json_build_object('label', t.label, 'status', t.status)
        FROM tickets t
        WHERE t.platform_id = p.id AND t.booking_day = ${day}
          AND t.status IN ('CALLED', 'SERVING')
        ORDER BY t.called_at DESC NULLS LAST
        LIMIT 1
      ) AS current,
      (
        SELECT COUNT(*) FROM tickets t
        WHERE t.platform_id = p.id AND t.booking_day = ${day} AND t.status = 'WAITING'
      ) AS waiting
    FROM platforms p
    WHERE p.outlet_id = ${outletId}
    ORDER BY p.code
  `;

  return {
    outlet,
    platforms: rows.map((r) => ({ ...r, waiting: Number(r.waiting) })),
  };
}
