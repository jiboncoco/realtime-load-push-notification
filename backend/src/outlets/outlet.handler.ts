// Handler Outlet & Platform: ambil claims (client_id) + input tervalidasi,
// panggil service, balas { data, error }.
import type { Context } from "hono";
import { ok } from "../lib/response.ts";
import type { AuthEnv } from "../auth/auth.middleware.ts";
import { outletService } from "./outlet.service.ts";

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
  return ok(c, await outletService.update(clientId(c), id(c), json(c)));
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
