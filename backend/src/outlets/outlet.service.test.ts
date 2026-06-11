// Unit test guard service Outlet/Platform (CLAUDE.md §4) — repo di-fake, tanpa DB.
import { describe, expect, test, mock } from "bun:test";
import { createOutletService } from "./outlet.service.ts";
import type { NewPlatform, OutletRepo, Platform } from "./outlet.repo.ts";

function fakeRepo(overrides: Partial<OutletRepo> = {}): OutletRepo {
  return {
    list: mock(async () => []),
    createWithPlatforms: mock(async (clientId, input) => ({
      id: "o1",
      client_id: clientId,
      name: input.name,
      code: "ABC234",
      accepting: true,
      address: input.address ?? null,
      created_at: "now",
      hours: [],
      platforms: input.platforms.map((p: NewPlatform, i: number) => ({
        id: `p${i}`,
        outlet_id: "o1",
        code: p.code,
        name: p.name,
        created_at: "now",
      })),
    })),
    getWithPlatforms: mock(async () => null),
    update: mock(async () => null),
    setHours: mock(async () => []),
    remove: mock(async () => false),
    addPlatform: mock(async () => null),
    updatePlatform: mock(async () => null),
    findPlatformWithSiblingCount: mock(async () => null),
    removePlatform: mock(async () => {}),
    listPublic: mock(async () => []),
    getPublicInfo: mock(async () => null),
    findByCode: mock(async () => null),
    ...overrides,
  };
}

const platform = (over: Partial<Platform> = {}): Platform => ({
  id: "p1",
  outlet_id: "o1",
  code: "A",
  name: "Kasir A",
  created_at: "now",
  ...over,
});

describe("outletService.create", () => {
  test("tanpa platform → VALIDATION_ERROR (outlet wajib >=1 platform)", async () => {
    const svc = createOutletService(fakeRepo());
    await expect(
      svc.create("c1", { name: "Outlet X", platforms: [] }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  test("dengan >=1 platform → diteruskan ke repo (atomic)", async () => {
    const repo = fakeRepo();
    const svc = createOutletService(repo);
    const result = await svc.create("c1", {
      name: "Outlet X",
      platforms: [{ code: "A", name: "Kasir A" }],
    });
    expect(result.platforms).toHaveLength(1);
    expect(repo.createWithPlatforms).toHaveBeenCalledTimes(1);
  });
});

describe("outletService.removePlatform", () => {
  test("platform terakhir → LAST_PLATFORM (409), tidak menghapus", async () => {
    const repo = fakeRepo({
      findPlatformWithSiblingCount: mock(async () => ({
        platform: platform(),
        siblingCount: 1,
      })),
    });
    const svc = createOutletService(repo);
    await expect(svc.removePlatform("c1", "p1")).rejects.toMatchObject({
      code: "LAST_PLATFORM",
      status: 409,
    });
    expect(repo.removePlatform).not.toHaveBeenCalled();
  });

  test("masih ada platform lain → terhapus", async () => {
    const repo = fakeRepo({
      findPlatformWithSiblingCount: mock(async () => ({
        platform: platform(),
        siblingCount: 2,
      })),
    });
    const svc = createOutletService(repo);
    await svc.removePlatform("c1", "p1");
    expect(repo.removePlatform).toHaveBeenCalledWith("p1");
  });

  test("platform tak ditemukan (atau lintas-tenant) → NOT_FOUND", async () => {
    const svc = createOutletService(fakeRepo());
    await expect(svc.removePlatform("c1", "p1")).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});
