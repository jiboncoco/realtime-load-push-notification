// Repo User & Operator. SEMUA query difilter client_id (scoping multi-tenant).
// Operator di-assign ke outlet via operator_outlets; outlet wajib milik client
// yang sama (divalidasi dalam transaksi).
import type { TransactionSql } from "postgres";
import { sql } from "../db/client.ts";
import { Errors } from "../lib/response.ts";
import type { Role } from "../lib/jwt.ts";

export type UserRow = {
  id: string;
  client_id: string;
  email: string;
  role: Role;
  name: string;
  is_active: boolean;
  created_at: string;
};

export type UserWithOutlets = UserRow & { outlet_ids: string[] };

export type CreateUserData = {
  email: string;
  passwordHash: string;
  name: string;
  role: Role;
  outletIds: string[];
};

export type UpdateUserData = {
  name?: string;
  role?: Role;
  is_active?: boolean;
  passwordHash?: string;
  outletIds?: string[]; // jika ada → ganti penuh assignment
};

// Kolom user yang aman dikembalikan (TANPA password_hash).
const userCols = sql`
  u.id, u.client_id, u.email, u.role, u.name, u.is_active, u.created_at,
  COALESCE(array_remove(array_agg(oo.outlet_id), NULL), '{}') AS outlet_ids
`;

function rethrowEmail(e: unknown): never {
  if (e && typeof e === "object" && (e as { code?: string }).code === "23505") {
    throw Errors.conflict("DUPLICATE_EMAIL", "Email sudah dipakai.");
  }
  throw e;
}

// Pastikan semua outletId milik client; lempar bila ada yang asing/lintas-tenant.
async function assertOutletsOwned(
  tx: TransactionSql,
  clientId: string,
  outletIds: string[],
) {
  if (outletIds.length === 0) return;
  const rows = await tx<{ id: string }[]>`
    SELECT id FROM outlets WHERE client_id = ${clientId} AND id = ANY(${outletIds})
  `;
  if (rows.length !== outletIds.length) {
    throw Errors.validation("Sebagian outlet tidak valid untuk client ini.");
  }
}

async function setAssignments(
  tx: TransactionSql,
  clientId: string,
  userId: string,
  role: Role,
  outletIds: string[],
) {
  await tx`DELETE FROM operator_outlets WHERE user_id = ${userId}`;
  // Admin akses penuh → tak butuh assignment.
  if (role !== "operator" || outletIds.length === 0) return;
  await assertOutletsOwned(tx, clientId, outletIds);
  for (const outletId of outletIds) {
    await tx`
      INSERT INTO operator_outlets (user_id, outlet_id)
      VALUES (${userId}, ${outletId})
    `;
  }
}

export interface UserRepo {
  list(clientId: string): Promise<UserWithOutlets[]>;
  getWithOutlets(clientId: string, userId: string): Promise<UserWithOutlets | null>;
  create(clientId: string, data: CreateUserData): Promise<UserWithOutlets>;
  update(
    clientId: string,
    userId: string,
    data: UpdateUserData,
  ): Promise<UserWithOutlets | null>;
  remove(clientId: string, userId: string): Promise<boolean>;
  countActiveAdmins(clientId: string): Promise<number>;
}

export const userRepo: UserRepo = {
  async list(clientId) {
    return sql<UserWithOutlets[]>`
      SELECT ${userCols}
      FROM users u
      LEFT JOIN operator_outlets oo ON oo.user_id = u.id
      WHERE u.client_id = ${clientId}
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `;
  },

  async getWithOutlets(clientId, userId) {
    const [row] = await sql<UserWithOutlets[]>`
      SELECT ${userCols}
      FROM users u
      LEFT JOIN operator_outlets oo ON oo.user_id = u.id
      WHERE u.client_id = ${clientId} AND u.id = ${userId}
      GROUP BY u.id
    `;
    return row ?? null;
  },

  async create(clientId, data) {
    try {
      const userId = await sql.begin(async (tx) => {
        const [row] = await tx<{ id: string }[]>`
          INSERT INTO users (client_id, email, password_hash, role, name)
          VALUES (${clientId}, ${data.email}, ${data.passwordHash}, ${data.role}, ${data.name})
          RETURNING id
        `;
        await setAssignments(tx, clientId, row!.id, data.role, data.outletIds);
        return row!.id;
      });
      return (await this.getWithOutlets(clientId, userId))!;
    } catch (e) {
      rethrowEmail(e);
    }
  },

  async update(clientId, userId, data) {
    const updated = await sql.begin(async (tx) => {
      const [row] = await tx<{ id: string; role: Role }[]>`
        UPDATE users SET
          name = COALESCE(${data.name ?? null}, name),
          role = COALESCE(${data.role ?? null}, role),
          is_active = COALESCE(${data.is_active ?? null}, is_active),
          password_hash = COALESCE(${data.passwordHash ?? null}, password_hash)
        WHERE id = ${userId} AND client_id = ${clientId}
        RETURNING id, role
      `;
      if (!row) return false;
      // Ganti assignment bila diminta, atau bersihkan jika jadi admin.
      if (data.outletIds !== undefined) {
        await setAssignments(tx, clientId, userId, row.role, data.outletIds);
      } else if (row.role === "admin") {
        await tx`DELETE FROM operator_outlets WHERE user_id = ${userId}`;
      }
      return true;
    });
    if (!updated) return null;
    return this.getWithOutlets(clientId, userId);
  },

  async remove(clientId, userId) {
    const rows = await sql`
      DELETE FROM users WHERE id = ${userId} AND client_id = ${clientId}
      RETURNING id
    `;
    return rows.length > 0;
  },

  async countActiveAdmins(clientId) {
    const [row] = await sql<{ count: string }[]>`
      SELECT COUNT(*) AS count FROM users
      WHERE client_id = ${clientId} AND role = 'admin' AND is_active = true
    `;
    return Number(row!.count);
  },
};
