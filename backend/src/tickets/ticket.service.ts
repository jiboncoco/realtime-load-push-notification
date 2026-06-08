// Service Queue Engine — Booking & Auto-assign. Repo di-inject agar bisa diuji
// tanpa DB. Setelah booking, broadcast ke topic outlet:{id} (realtime).
import { Errors } from "../lib/response.ts";
import { broadcast } from "../ws/broadcast.ts";
import {
  ticketRepo,
  type TicketRepo,
  type TicketStatusView,
  type TicketWithPlatform,
} from "./ticket.repo.ts";

export function createTicketService(repo: TicketRepo) {
  return {
    async book(
      outletId: string,
      deviceToken: string | null,
    ): Promise<TicketWithPlatform> {
      const ticket = await repo.book(outletId, deviceToken);
      // CMS/TV memantau antrian outlet ini (no-op sampai modul realtime).
      broadcast(`outlet:${outletId}`, {
        type: "ticket.created",
        ticket: {
          id: ticket.id,
          label: ticket.label,
          platform_id: ticket.platform_id,
          status: ticket.status,
        },
      });
      return ticket;
    },

    async getStatus(ticketId: string): Promise<TicketStatusView> {
      const view = await repo.getView(ticketId);
      if (!view) throw Errors.notFound("Tiket");
      return view;
    },
  };
}

export type TicketService = ReturnType<typeof createTicketService>;

export const ticketService = createTicketService(ticketRepo);
