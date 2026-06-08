// Handler operasi operator. Aktor dari JWT (claims), scoping di service.
import type { Context } from "hono";
import { ok } from "../lib/response.ts";
import type { AuthEnv } from "../auth/auth.middleware.ts";
import type { TicketAction } from "./ticket.actions.ts";
import { ticketOpsService } from "./ticketops.service.ts";

type Ctx = Context<AuthEnv>;

const claims = (c: Ctx) => c.get("claims");
const id = (c: Ctx) => c.req.param("id")!;

// Satu handler untuk semua aksi (call/serve/complete/skip).
export const actionHandler = (action: TicketAction) => async (c: Ctx) =>
  ok(c, await ticketOpsService.act(claims(c), id(c), action));

export async function getQueue(c: Ctx) {
  return ok(c, await ticketOpsService.queue(claims(c), id(c)));
}

export async function listMyOutlets(c: Ctx) {
  return ok(c, await ticketOpsService.listOutlets(claims(c)));
}
