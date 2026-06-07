// Service Outlet & Platform. Aturan bisnis CLAUDE.md §6:
// - outlet wajib >=1 platform saat dibuat (atomic di repo)
// - tak bisa hapus platform terakhir di sebuah outlet
// Repo di-inject agar guard bisa diuji tanpa DB (outlet.service.test.ts).
import { Errors } from "../lib/response.ts";
import {
  outletRepo,
  type NewPlatform,
  type OutletRepo,
} from "./outlet.repo.ts";

export type CreateOutletInput = {
  name: string;
  address?: string | null;
  platforms: NewPlatform[];
};

export function createOutletService(repo: OutletRepo) {
  async function getOwnedOutlet(clientId: string, outletId: string) {
    const outlet = await repo.getWithPlatforms(clientId, outletId);
    if (!outlet) throw Errors.notFound("Outlet");
    return outlet;
  }

  return {
    list: (clientId: string) => repo.list(clientId),

    async create(clientId: string, input: CreateOutletInput) {
      // Guard utama: outlet wajib punya >=1 platform.
      if (input.platforms.length < 1) {
        throw Errors.validation("Outlet wajib punya minimal 1 platform.");
      }
      return repo.createWithPlatforms(clientId, input);
    },

    get: getOwnedOutlet,

    async update(
      clientId: string,
      outletId: string,
      patch: { name?: string; address?: string | null },
    ) {
      const outlet = await repo.update(clientId, outletId, patch);
      if (!outlet) throw Errors.notFound("Outlet");
      return outlet;
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
  };
}

export type OutletService = ReturnType<typeof createOutletService>;

export const outletService = createOutletService(outletRepo);
