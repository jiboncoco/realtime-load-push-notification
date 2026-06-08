// Repo operasi operator (Call & Skip) + snapshot antrian. Scoping ditegakkan
// di service via getOutletAccess/isOperatorAssigned (data dari sini).
import { sql } from "../db/client.ts";
import { wibDay } from "./ticket.label.ts";
import type { PlatformBrief, TicketStatusValue } from "./ticket.repo.ts";
import type { NextState, TicketAction } from "./ticket.actions.ts";

export type ActionTicket = {
  id: string;
  outlet_id: string;
  platform_id: string;
  number: number;
  label: string;
  status: TicketStatusValue;
  call_count: number;
  platform: PlatformBrief;
};

export type QueueItem = {
  id: string;
  platform_id: string;
  number: number;
  label: string;
  status: TicketStatusValue;
  call_count: number;
};

export type QueueSnapshot = {
  platforms: PlatformBrief[];
  tickets: QueueItem[];
};

export type OutletRef = { id: string; name: string };

export interface TicketOpsRepo {
  getOutletAccess(outletId: string): Promise<{ client_id: string } | null>;
  isOperatorAssigned(userId: string, outletId: string): Promise<boolean>;
  accessibleOutlets(
    role: "admin" | "operator",
    clientId: string,
    userId: string,
  ): Promise<OutletRef[]>;
  findForAction(
    ticketId: string,
  ): Promise<{ id: string; outlet_id: string; status: TicketStatusValue; call_count: number } | null>;
  applyAction(input: {
    ticketId: string;
    fromStatus: TicketStatusValue;
    fromCallCount: number;
    next: NextState;
    action: TicketAction;
    actorUserId: string;
  }): Promise<ActionTicket | null>;
  queue(outletId: string): Promise<QueueSnapshot>;
}

export const ticketOpsRepo: TicketOpsRepo = {
  async getOutletAccess(outletId) {
    const [row] = await sql<{ client_id: string }[]>`
      SELECT client_id FROM outlets WHERE id = ${outletId}
    `;
    return row ?? null;
  },

  async isOperatorAssigned(userId, outletId) {
    const rows = await sql`
      SELECT 1 FROM operator_outlets
      WHERE user_id = ${userId} AND outlet_id = ${outletId}
    `;
    return rows.length > 0;
  },

  async accessibleOutlets(role, clientId, userId) {
    if (role === "admin") {
      return sql<OutletRef[]>`
        SELECT id, name FROM outlets WHERE client_id = ${clientId} ORDER BY name
      `;
    }
    return sql<OutletRef[]>`
      SELECT o.id, o.name FROM outlets o
      JOIN operator_outlets oo ON oo.outlet_id = o.id
      WHERE oo.user_id = ${userId} AND o.client_id = ${clientId}
      ORDER BY o.name
    `;
  },

  async findForAction(ticketId) {
    const [row] = await sql<
      { id: string; outlet_id: string; status: TicketStatusValue; call_count: number }[]
    >`
      SELECT id, outlet_id, status, call_count FROM tickets WHERE id = ${ticketId}
    `;
    return row ?? null;
  },

  async applyAction({ ticketId, fromStatus, fromCallCount, next, action, actorUserId }) {
    return sql.begin(async (tx) => {
      // Optimistic guard: hanya update bila status & call_count belum berubah
      // (cegah dua klik operator bersamaan).
      const [updated] = await tx<
        Omit<ActionTicket, "platform">[]
      >`
        UPDATE tickets SET
          status = ${next.status},
          call_count = ${next.call_count},
          called_at = ${next.touchCalledAt ? tx`now()` : tx`called_at`},
          completed_at = ${next.touchCompletedAt ? tx`now()` : tx`completed_at`}
        WHERE id = ${ticketId}
          AND status = ${fromStatus}
          AND call_count = ${fromCallCount}
        RETURNING id, outlet_id, platform_id, number, label, status, call_count
      `;
      if (!updated) return null;

      // Audit (TDD §4.2): catat aksi di ticket_events.
      await tx`
        INSERT INTO ticket_events (ticket_id, type, actor_user_id)
        VALUES (${ticketId}, ${action}, ${actorUserId})
      `;

      const [platform] = await tx<PlatformBrief[]>`
        SELECT id, code, name FROM platforms WHERE id = ${updated.platform_id}
      `;
      return { ...updated, platform: platform! };
    });
  },

  async queue(outletId) {
    const day = wibDay();
    const platforms = await sql<PlatformBrief[]>`
      SELECT id, code, name FROM platforms WHERE outlet_id = ${outletId} ORDER BY code
    `;
    const tickets = await sql<QueueItem[]>`
      SELECT id, platform_id, number, label, status, call_count
      FROM tickets
      WHERE outlet_id = ${outletId}
        AND booking_day = ${day}
        AND status IN ('WAITING', 'CALLED', 'SERVING')
      ORDER BY number
    `;
    return { platforms, tickets };
  },
};
