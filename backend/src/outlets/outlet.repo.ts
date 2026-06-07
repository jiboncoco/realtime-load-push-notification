// Repo Outlet & Platform. SEMUA query difilter client_id (scoping multi-tenant
// di aplikasi, CLAUDE.md §4) — termasuk operasi platform via join ke outlets.
import { sql } from "../db/client.ts";
import { Errors } from "../lib/response.ts";

export type Outlet = {
  id: string;
  client_id: string;
  name: string;
  address: string | null;
  created_at: string;
};

export type Platform = {
  id: string;
  outlet_id: string;
  code: string;
  name: string;
  created_at: string;
};

export type OutletWithPlatforms = Outlet & { platforms: Platform[] };

export type NewPlatform = { code: string; name: string };

// Postgres unique_violation → konflik domain (mis. code platform dobel di outlet).
function rethrowUnique(e: unknown, message: string): never {
  if (e && typeof e === "object" && (e as { code?: string }).code === "23505") {
    throw Errors.conflict("DUPLICATE_PLATFORM_CODE", message);
  }
  throw e;
}

export interface OutletRepo {
  list(clientId: string): Promise<Outlet[]>;
  createWithPlatforms(
    clientId: string,
    input: { name: string; address?: string | null; platforms: NewPlatform[] },
  ): Promise<OutletWithPlatforms>;
  getWithPlatforms(
    clientId: string,
    outletId: string,
  ): Promise<OutletWithPlatforms | null>;
  update(
    clientId: string,
    outletId: string,
    patch: { name?: string; address?: string | null },
  ): Promise<Outlet | null>;
  remove(clientId: string, outletId: string): Promise<boolean>;
  addPlatform(
    clientId: string,
    outletId: string,
    input: NewPlatform,
  ): Promise<Platform | null>;
  updatePlatform(
    clientId: string,
    platformId: string,
    patch: { code?: string; name?: string },
  ): Promise<Platform | null>;
  // Info platform + jumlah platform di outlet-nya (untuk guard hapus terakhir).
  findPlatformWithSiblingCount(
    clientId: string,
    platformId: string,
  ): Promise<{ platform: Platform; siblingCount: number } | null>;
  removePlatform(platformId: string): Promise<void>;
}

export const outletRepo: OutletRepo = {
  async list(clientId) {
    return sql<Outlet[]>`
      SELECT id, client_id, name, address, created_at
      FROM outlets WHERE client_id = ${clientId}
      ORDER BY created_at DESC
    `;
  },

  async createWithPlatforms(clientId, input) {
    try {
      return await sql.begin(async (tx) => {
        const [outlet] = await tx<Outlet[]>`
          INSERT INTO outlets (client_id, name, address)
          VALUES (${clientId}, ${input.name}, ${input.address ?? null})
          RETURNING id, client_id, name, address, created_at
        `;
        const platforms: Platform[] = [];
        for (const p of input.platforms) {
          const [row] = await tx<Platform[]>`
            INSERT INTO platforms (outlet_id, code, name)
            VALUES (${outlet!.id}, ${p.code}, ${p.name})
            RETURNING id, outlet_id, code, name, created_at
          `;
          platforms.push(row!);
        }
        return { ...outlet!, platforms };
      });
    } catch (e) {
      rethrowUnique(e, "Kode platform duplikat dalam outlet.");
    }
  },

  async getWithPlatforms(clientId, outletId) {
    const [outlet] = await sql<Outlet[]>`
      SELECT id, client_id, name, address, created_at
      FROM outlets WHERE id = ${outletId} AND client_id = ${clientId}
    `;
    if (!outlet) return null;
    const platforms = await sql<Platform[]>`
      SELECT id, outlet_id, code, name, created_at
      FROM platforms WHERE outlet_id = ${outletId}
      ORDER BY code ASC
    `;
    return { ...outlet, platforms };
  },

  async update(clientId, outletId, patch) {
    const [row] = await sql<Outlet[]>`
      UPDATE outlets SET
        name = COALESCE(${patch.name ?? null}, name),
        address = ${patch.address === undefined ? sql`address` : patch.address}
      WHERE id = ${outletId} AND client_id = ${clientId}
      RETURNING id, client_id, name, address, created_at
    `;
    return row ?? null;
  },

  async remove(clientId, outletId) {
    const rows = await sql`
      DELETE FROM outlets WHERE id = ${outletId} AND client_id = ${clientId}
      RETURNING id
    `;
    return rows.length > 0;
  },

  async addPlatform(clientId, outletId, input) {
    // Pastikan outlet milik client sebelum insert.
    const [outlet] = await sql<{ id: string }[]>`
      SELECT id FROM outlets WHERE id = ${outletId} AND client_id = ${clientId}
    `;
    if (!outlet) return null;
    try {
      const [row] = await sql<Platform[]>`
        INSERT INTO platforms (outlet_id, code, name)
        VALUES (${outletId}, ${input.code}, ${input.name})
        RETURNING id, outlet_id, code, name, created_at
      `;
      return row!;
    } catch (e) {
      rethrowUnique(e, "Kode platform sudah dipakai di outlet ini.");
    }
  },

  async updatePlatform(clientId, platformId, patch) {
    try {
      const [row] = await sql<Platform[]>`
        UPDATE platforms p SET
          code = COALESCE(${patch.code ?? null}, p.code),
          name = COALESCE(${patch.name ?? null}, p.name)
        FROM outlets o
        WHERE p.id = ${platformId} AND p.outlet_id = o.id AND o.client_id = ${clientId}
        RETURNING p.id, p.outlet_id, p.code, p.name, p.created_at
      `;
      return row ?? null;
    } catch (e) {
      rethrowUnique(e, "Kode platform sudah dipakai di outlet ini.");
    }
  },

  async findPlatformWithSiblingCount(clientId, platformId) {
    const [row] = await sql<(Platform & { sibling_count: string })[]>`
      SELECT p.id, p.outlet_id, p.code, p.name, p.created_at,
             (SELECT COUNT(*) FROM platforms s WHERE s.outlet_id = p.outlet_id) AS sibling_count
      FROM platforms p
      JOIN outlets o ON o.id = p.outlet_id
      WHERE p.id = ${platformId} AND o.client_id = ${clientId}
    `;
    if (!row) return null;
    const { sibling_count, ...platform } = row;
    return { platform, siblingCount: Number(sibling_count) };
  },

  async removePlatform(platformId) {
    await sql`DELETE FROM platforms WHERE id = ${platformId}`;
  },
};
