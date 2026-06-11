// Service Outlet & Platform. Aturan bisnis CLAUDE.md §6:
// - outlet wajib >=1 platform saat dibuat (atomic di repo)
// - tak bisa hapus platform terakhir di sebuah outlet
// Plus (revisi): status buka/tutup (accepting + jam operasional) & data publik.
// Repo di-inject agar guard bisa diuji tanpa DB (outlet.service.test.ts).
import { Errors } from "../lib/response.ts";
import {
  outletRepo,
  type NewPlatform,
  type Outlet,
  type OutletRepo,
  type PublicOutlet,
} from "./outlet.repo.ts";
import { formatOutletCode } from "./outlet.code.ts";
import { computeOpen, type DayHours } from "./outlet.status.ts";

export type CreateOutletInput = {
  name: string;
  address?: string | null;
  platforms: NewPlatform[];
};

// Tambahkan kode tampilan + status buka/tutup terhitung ke objek outlet.
function withStatus<T extends { code: string; accepting: boolean; hours: DayHours[] }>(
  o: T,
) {
  const status = computeOpen(o.accepting, o.hours);
  return {
    ...o,
    code_display: formatOutletCode(o.code),
    open: status.open,
    open_reason: status.reason,
    today_hours: status.today,
  };
}

// Bentuk publik (tanpa client_id) untuk customer app.
function publicView(o: PublicOutlet) {
  const { ...rest } = withStatus(o);
  return rest;
}

export function createOutletService(repo: OutletRepo) {
  async function getOwnedOutlet(clientId: string, outletId: string) {
    const outlet = await repo.getWithPlatforms(clientId, outletId);
    if (!outlet) throw Errors.notFound("Outlet");
    return withStatus(outlet);
  }

  return {
    async list(clientId: string) {
      const outlets = await repo.list(clientId);
      return outlets.map(withStatus);
    },

    async create(clientId: string, input: CreateOutletInput) {
      // Guard utama: outlet wajib punya >=1 platform.
      if (input.platforms.length < 1) {
        throw Errors.validation("Outlet wajib punya minimal 1 platform.");
      }
      return withStatus(await repo.createWithPlatforms(clientId, input));
    },

    get: getOwnedOutlet,

    async update(
      clientId: string,
      outletId: string,
      patch: { name?: string; address?: string | null; accepting?: boolean },
    ) {
      const outlet = await repo.update(clientId, outletId, patch);
      if (!outlet) throw Errors.notFound("Outlet");
      return outlet as Outlet;
    },

    async setHours(clientId: string, outletId: string, hours: DayHours[]) {
      const saved = await repo.setHours(clientId, outletId, hours);
      if (saved === null) throw Errors.notFound("Outlet");
      return saved;
    },

    async remove(clientId: string, outletId: string) {
      const ok = await repo.remove(clientId, outletId);
      if (!ok) throw Errors.notFound("Outlet");
    },

    async addPlatform(clientId: string, outletId: string, input: NewPlatform) {
      const platform = await repo.addPlatform(clientId, outletId, input);
      if (!platform) throw Errors.notFound("Outlet");
      return platform;
    },

    async updatePlatform(
      clientId: string,
      platformId: string,
      patch: { code?: string; name?: string },
    ) {
      const platform = await repo.updatePlatform(clientId, platformId, patch);
      if (!platform) throw Errors.notFound("Platform");
      return platform;
    },

    async removePlatform(clientId: string, platformId: string) {
      const found = await repo.findPlatformWithSiblingCount(clientId, platformId);
      if (!found) throw Errors.notFound("Platform");
      // Guard: outlet harus tetap punya >=1 platform.
      if (found.siblingCount <= 1) {
        throw Errors.conflict(
          "LAST_PLATFORM",
          "Tidak bisa menghapus platform terakhir di outlet.",
        );
      }
      await repo.removePlatform(platformId);
    },

    // ── Publik (customer) ────────────────────────────────────────────────
    async listPublic() {
      const outlets = await repo.listPublic();
      return outlets.map(publicView);
    },

    async getPublicInfo(outletId: string) {
      const o = await repo.getPublicInfo(outletId);
      if (!o) throw Errors.notFound("Outlet");
      return publicView(o);
    },

    async getByCode(code: string) {
      const o = await repo.findByCode(code);
      if (!o) throw Errors.notFound("Outlet");
      return publicView(o);
    },
  };
}

export type OutletService = ReturnType<typeof createOutletService>;

export const outletService = createOutletService(outletRepo);
