// Handler User & Operator: claims (client_id) + input tervalidasi → service.
import type { Context } from "hono";
import { ok } from "../lib/response.ts";
import type { AuthEnv } from "../auth/auth.middleware.ts";
import { userService } from "./user.service.ts";

type Ctx = Context<AuthEnv>;

const clientId = (c: Ctx) => c.get("claims").client_id;
const id = (c: Ctx) => c.req.param("id")!;
const json = (c: Ctx) => c.req.valid("json" as never) as any;

export async function listUsers(c: Ctx) {
  return ok(c, await userService.list(clientId(c)));
}

export async function createUser(c: Ctx) {
  return ok(c, await userService.create(clientId(c), json(c)), 201);
}

export async function getUser(c: Ctx) {
  return ok(c, await userService.get(clientId(c), id(c)));
}

export async function updateUser(c: Ctx) {
  return ok(c, await userService.update(clientId(c), id(c), json(c)));
}

export async function deleteUser(c: Ctx) {
  await userService.remove(clientId(c), id(c));
  return ok(c, { deleted: true });
}
