// Handler Queue Engine — Booking. PUBLIK (tanpa auth); identitas anonim via
// device_token opsional.
import type { Context } from "hono";
import { ok } from "../lib/response.ts";
import { ticketService } from "./ticket.service.ts";

export async function bookTicket(c: Context) {
  const { device_token } = c.req.valid("json" as never) as {
    device_token?: string | null;
  };
  const outletId = c.req.param("id")!;
  const ticket = await ticketService.book(outletId, device_token ?? null);
  return ok(c, ticket, 201);
}

export async function getTicket(c: Context) {
  const ticketId = c.req.param("id")!;
  return ok(c, await ticketService.getStatus(ticketId));
}
