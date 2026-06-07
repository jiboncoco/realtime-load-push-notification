// Service layer Auth. Logika murni (verifikasi pw + terbit JWT), repo di-inject
// agar bisa diuji tanpa DB (lihat auth.service.test.ts).
import { signSession } from "../lib/jwt.ts";
import { Errors } from "../lib/response.ts";
import { authRepo, type AuthRepo, type AuthUserRow } from "./auth.repo.ts";

export type PublicUser = {
  id: string;
  email: string;
  name: string;
  role: AuthUserRow["role"];
  client_id: string;
};

export type LoginResult = {
  token: string;
  user: PublicUser;
};

function toPublicUser(u: AuthUserRow): PublicUser {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    client_id: u.client_id,
  };
}

export function createAuthService(repo: AuthRepo) {
  return {
    async login(email: string, password: string): Promise<LoginResult> {
      const user = await repo.findActiveUserByEmail(email);
      // Verifikasi pw walau user tak ada untuk mengurangi timing leak.
      const hash =
        user?.password_hash ??
        "$argon2id$v=19$m=65536,t=2,p=1$ZHVtbXlkdW1teWR1bW15$0000000000000000000000000000000000000000000";
      const valid = await Bun.password.verify(password, hash).catch(() => false);

      if (!user || !valid) {
        throw Errors.invalidCredentials();
      }

      const token = await signSession({
        sub: user.id,
        client_id: user.client_id,
        role: user.role,
      });

      return { token, user: toPublicUser(user) };
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;

// Instance produksi (pakai repo asli).
export const authService = createAuthService(authRepo);
