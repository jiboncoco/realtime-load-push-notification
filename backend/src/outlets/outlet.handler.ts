// Handler Outlet & Platform: ambil claims (client_id) + input tervalidasi,
// panggil service, balas { data, error }.
import type { Context } from "hono";
import { ok } from "../lib/response.ts";
import type { AuthEnv } from "../auth/auth.middleware.ts";
import { outletService } from "./outlet.service.ts";
import { normalizeOutletCode } from "./outlet.code.ts";
import { broadcast } from "../ws/broadcast.ts";

type Ctx = Context<AuthEnv>;

const clientId = (c: Ctx) => c.get("claims").client_id;
const id = (c: Ctx) => c.req.param("id")!; // route selalu punya :id
const json = (c: Ctx) => c.req.valid("json" as never) as any;

export async function listOutlets(c: Ctx) {
  return ok(c, await outletService.list(clientId(c)));
}

export async function createOutlet(c: Ctx) {
  const body = json(c);
  return ok(c, await outletService.create(clientId(c), body), 201);
}

export async function getOutlet(c: Ctx) {
  return ok(c, await outletService.get(clientId(c), id(c)));
}

export async function updateOutlet(c: Ctx) {
  const outlet = await outletService.update(clientId(c), id(c), json(c));
  // Toggle buka/tutup berdampak ke customer/TV → beri sinyal refresh.
  broadcast(`outlet:${outlet.id}`, { type: "outlet.updated" });
  return ok(c, outlet);
}

// PUT /outlets/:id/hours — ganti seluruh jadwal jam operasional.
export async function setOutletHours(c: Ctx) {
  const { hours } = json(c) as {
    hours: {
      weekday: number;
      is_closed: boolean;
      open_time?: string | null;
      close_time?: string | null;
    }[];
  };
  const saved = await outletService.setHours(
    clientId(c),
    id(c),
    hours.map((h) => ({
      weekday: h.weekday,
      is_closed: h.is_closed,
      open_time: h.open_time ?? null,
      close_time: h.close_time ?? null,
    })),
  );
  broadcast(`outlet:${id(c)}`, { type: "outlet.updated" });
  return ok(c, saved);
}

// ── Publik (customer, tanpa auth) ──────────────────────────────────────────
export async function listPublicOutlets(c: Ctx) {
  return ok(c, await outletService.listPublic());
}

export async function getOutletInfo(c: Ctx) {
  return ok(c, await outletService.getPublicInfo(id(c)));
}

export async function getOutletByCode(c: Ctx) {
  const code = normalizeOutletCode(c.req.param("code")!);
  return ok(c, await outletService.getByCode(code));
}

export async function deleteOutlet(c: Ctx) {
  await outletService.remove(clientId(c), id(c));
  return ok(c, { deleted: true });
}

export async function addPlatform(c: Ctx) {
  const platform = await outletService.addPlatform(
    clientId(c),
    id(c),
    json(c),
  );
  return ok(c, platform, 201);
}

export async function updatePlatform(c: Ctx) {
  return ok(
    c,
    await outletService.updatePlatform(clientId(c), id(c), json(c)),
  );
}

export async function deletePlatform(c: Ctx) {
  await outletService.removePlatform(clientId(c), id(c));
  return ok(c, { deleted: true });
}
