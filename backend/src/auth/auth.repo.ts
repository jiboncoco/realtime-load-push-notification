// Repo layer Auth. Akses DB; di sinilah disiplin scoping multi-tenant ditegakkan.
// Login by email global (email UNIQUE lintas client), tapi client_id ikut terbawa
// di hasil agar diselipkan ke JWT untuk scoping query modul berikutnya.
import { sql } from "../db/client.ts";
import type { Role } from "../lib/jwt.ts";

export type AuthUserRow = {
  id: string;
  client_id: string;
  email: string;
  password_hash: string;
  role: Role;
  name: string;
  is_active: boolean;
};

export interface AuthRepo {
  findActiveUserByEmail(email: string): Promise<AuthUserRow | null>;
}

export const authRepo: AuthRepo = {
  async findActiveUserByEmail(email) {
    const rows = await sql<AuthUserRow[]>`
      SELECT id, client_id, email, password_hash, role, name, is_active
      FROM users
      WHERE email = ${email} AND is_active = true
      LIMIT 1
    `;
    return rows[0] ?? null;
  },
};
