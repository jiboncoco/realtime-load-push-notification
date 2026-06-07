// Wrapper sign/verify di atas hono/jwt. Payload sesi CMS (TDD §8).
import { sign, verify } from "hono/jwt";
import { env } from "./env.ts";

const ALG = "HS256" as const;

export type Role = "admin" | "operator";

export type SessionClaims = {
  sub: string; // user id
  client_id: string; // tenant scoping
  role: Role;
};

// JWT exp dalam detik (epoch). Default 7 hari.
const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 7;

export async function signSession(
  claims: SessionClaims,
  ttlSeconds = DEFAULT_TTL_SECONDS,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return sign(
    { ...claims, iat: now, exp: now + ttlSeconds },
    env.jwtSecret,
    ALG,
  );
}

export async function verifySession(token: string): Promise<SessionClaims> {
  const payload = await verify(token, env.jwtSecret, ALG);
  return {
    sub: String(payload.sub),
    client_id: String(payload.client_id),
    role: payload.role as Role,
  };
}
