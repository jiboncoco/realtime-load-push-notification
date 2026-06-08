// Service operasi operator (Call & Skip) + queue snapshot.
// Otorisasi: operator hanya outlet yang di-assign; admin penuh dalam client-nya.
// Repo di-inject agar bisa diuji tanpa DB.
import { Errors } from "../lib/response.ts";
import type { SessionClaims } from "../lib/jwt.ts";
import { broadcast } from "../ws/broadcast.ts";
import { nextState, type TicketAction } from "./ticket.actions.ts";
import {
  ticketOpsRepo,
  type ActionTicket,
  type QueueSnapshot,
  type TicketOpsRepo,
} from "./ticketops.repo.ts";

export function createTicketOpsService(repo: TicketOpsRepo) {
  // Pastikan aktor boleh mengakses outlet ini. Lintas-tenant → 404 (jangan bocor).
  async function assertOutletAccess(claims: SessionClaims, outletId: string) {
    const access = await repo.getOutletAccess(outletId);
    if (!access || access.client_id !== claims.client_id) {
      throw Errors.notFound("Outlet");
    }
    if (
      claims.role === "operator" &&
      !(await repo.isOperatorAssigned(claims.sub, outletId))
    ) {
      throw Errors.forbidden();
    }
  }

  return {
    listOutlets: (claims: SessionClaims) =>
      repo.accessibleOutlets(claims.role, claims.client_id, claims.sub),

    async queue(claims: SessionClaims, outletId: string): Promise<QueueSnapshot> {
      await assertOutletAccess(claims, outletId);
      return repo.queue(outletId);
    },

    async act(
      claims: SessionClaims,
      ticketId: string,
      action: TicketAction,
    ): Promise<ActionTicket> {
      const current = await repo.findForAction(ticketId);
      if (!current) throw Errors.notFound("Tiket");
      await assertOutletAccess(claims, current.outlet_id);

      const next = nextState(action, current); // lempar bila transisi tak valid

      const updated = await repo.applyAction({
        ticketId,
        fromStatus: current.status,
        fromCallCount: current.call_count,
        next,
        action,
        actorUserId: claims.sub,
      });
      if (!updated) {
        throw Errors.conflict("CONFLICT", "Status tiket berubah, coba lagi.");
      }

      // Realtime: TV/CMS memantau outlet, customer memantau tiketnya.
      const payload = {
        type: `ticket.${action}`,
        ticket: {
          id: updated.id,
          label: updated.label,
          platform_id: updated.platform_id,
          status: updated.status,
          call_count: updated.call_count,
        },
      };
      broadcast(`outlet:${updated.outlet_id}`, payload);
      broadcast(`ticket:${updated.id}`, payload);

      return updated;
    },
  };
}

export type TicketOpsService = ReturnType<typeof createTicketOpsService>;

export const ticketOpsService = createTicketOpsService(ticketOpsRepo);
