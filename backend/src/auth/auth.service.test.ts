// Unit test service Auth (CLAUDE.md §4: unit test wajib di service layer).
// Repo di-fake → tanpa DB. Menguji verifikasi pw, isi JWT, dan kasus gagal.
import { describe, expect, test } from "bun:test";
import { createAuthService } from "./auth.service.ts";
import type { AuthRepo, AuthUserRow } from "./auth.repo.ts";
import { verifySession } from "../lib/jwt.ts";
import { AppError } from "../lib/response.ts";

const PASSWORD = "admin12345";

async function makeUser(): Promise<AuthUserRow> {
  return {
    id: "user-1",
    client_id: "client-1",
    email: "admin@demo.test",
    password_hash: await Bun.password.hash(PASSWORD),
    role: "admin",
    name: "Demo Admin",
    is_active: true,
  };
}

function repoWith(user: AuthUserRow | null): AuthRepo {
  return {
    async findActiveUserByEmail(email) {
      return user && user.email === email ? user : null;
    },
  };
}

describe("authService.login", () => {
  test("kredensial benar → token + public user (tanpa password_hash)", async () => {
    const user = await makeUser();
    const svc = createAuthService(repoWith(user));

    const result = await svc.login(user.email, PASSWORD);

    expect(result.user).toEqual({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      client_id: user.client_id,
    });
    expect((result.user as Record<string, unknown>).password_hash).toBeUndefined();

    // JWT memuat role & client_id (acceptance §6).
    const claims = await verifySession(result.token);
    expect(claims.sub).toBe(user.id);
    expect(claims.client_id).toBe(user.client_id);
    expect(claims.role).toBe("admin");
  });

  test("password salah → INVALID_CREDENTIALS", async () => {
    const user = await makeUser();
    const svc = createAuthService(repoWith(user));

    await expect(svc.login(user.email, "wrong-pass")).rejects.toMatchObject({
      code: "INVALID_CREDENTIALS",
    });
  });

  test("user tidak ada → INVALID_CREDENTIALS", async () => {
    const svc = createAuthService(repoWith(null));

    const err = await svc.login("nobody@demo.test", PASSWORD).catch((e) => e);
    expect(err).toBeInstanceOf(AppError);
    expect(err.code).toBe("INVALID_CREDENTIALS");
    expect(err.status).toBe(401);
  });
});
