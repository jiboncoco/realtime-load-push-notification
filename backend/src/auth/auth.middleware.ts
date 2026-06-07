// Middleware proteksi: verifikasi JWT Bearer → simpan claims di context.
// requireRole menjaga endpoint per role (admin/operator).
import { createMiddleware } from "hono/factory";
import { verifySession, type Role, type SessionClaims } from "../lib/jwt.ts";
import { Errors } from "../lib/response.ts";

// Tipe context untuk router terproteksi: c.get("claims") tersedia & typed.
export type AuthEnv = { Variables: { claims: SessionClaims } };

export const requireAuth = createMiddleware<AuthEnv>(async (c, next) => {
  const header = c.req.header("authorization");
  if (!header?.startsWith("Bearer ")) {
    throw Errors.unauthorized();
  }
  try {
    const claims = await verifySession(header.slice(7));
    c.set("claims", claims);
  } catch {
    throw Errors.unauthorized();
  }
  await next();
});

export const requireRole = (role: Role) =>
  createMiddleware<AuthEnv>(async (c, next) => {
    if (c.get("claims").role !== role) {
      throw Errors.forbidden();
    }
    await next();
  });
