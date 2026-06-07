// Handler layer Auth: ambil input tervalidasi, panggil service, balas { data, error }.
import type { Context } from "hono";
import { ok } from "../lib/response.ts";
import { authService } from "./auth.service.ts";

export async function loginHandler(c: Context) {
  const { email, password } = c.req.valid("json" as never) as {
    email: string;
    password: string;
  };
  const result = await authService.login(email, password);
  return ok(c, result);
}
