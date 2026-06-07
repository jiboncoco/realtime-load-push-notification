// Unit test service User/Operator (CLAUDE.md §4) — repo & hasher di-fake, tanpa DB.
import { describe, expect, test, mock } from "bun:test";
import { createUserService } from "./user.service.ts";
import type { UserRepo, UserWithOutlets } from "./user.repo.ts";

const fakeHash = async (p: string) => `hashed:${p}`;

function user(over: Partial<UserWithOutlets> = {}): UserWithOutlets {
  return {
    id: "u1",
    client_id: "c1",
    email: "a@demo.test",
    role: "admin",
    name: "Admin",
    is_active: true,
    created_at: "now",
    outlet_ids: [],
    ...over,
  };
}

function fakeRepo(over: Partial<UserRepo> = {}): UserRepo {
  return {
    list: mock(async () => []),
    getWithOutlets: mock(async () => null),
    create: mock(async (clientId, data) => user({ client_id: clientId, ...data })),
    update: mock(async () => user()),
    remove: mock(async () => true),
    countActiveAdmins: mock(async () => 2),
    ...over,
  };
}

describe("userService.create", () => {
  test("password di-hash; admin tak dapat outlet assignment", async () => {
    const repo = fakeRepo();
    const svc = createUserService(repo, fakeHash);
    await svc.create("c1", {
      email: "x@demo.test",
      password: "secret123",
      name: "X",
      role: "admin",
      outlet_ids: ["o1"], // diabaikan untuk admin
    });
    expect(repo.create).toHaveBeenCalledTimes(1);
    const arg = (repo.create as any).mock.calls[0][1];
    expect(arg.passwordHash).toBe("hashed:secret123");
    expect(arg.outletIds).toEqual([]);
  });

  test("operator membawa outlet_ids ke repo", async () => {
    const repo = fakeRepo();
    const svc = createUserService(repo, fakeHash);
    await svc.create("c1", {
      email: "op@demo.test",
      password: "secret123",
      name: "Op",
      role: "operator",
      outlet_ids: ["o1", "o2"],
    });
    const arg = (repo.create as any).mock.calls[0][1];
    expect(arg.outletIds).toEqual(["o1", "o2"]);
  });
});

describe("guard admin aktif terakhir", () => {
  test("hapus admin aktif terakhir → LAST_ADMIN, tidak menghapus", async () => {
    const repo = fakeRepo({
      getWithOutlets: mock(async () => user()),
      countActiveAdmins: mock(async () => 1),
    });
    const svc = createUserService(repo, fakeHash);
    await expect(svc.remove("c1", "u1")).rejects.toMatchObject({
      code: "LAST_ADMIN",
      status: 409,
    });
    expect(repo.remove).not.toHaveBeenCalled();
  });

  test("nonaktifkan admin aktif terakhir → LAST_ADMIN", async () => {
    const repo = fakeRepo({
      getWithOutlets: mock(async () => user()),
      countActiveAdmins: mock(async () => 1),
    });
    const svc = createUserService(repo, fakeHash);
    await expect(
      svc.update("c1", "u1", { is_active: false }),
    ).rejects.toMatchObject({ code: "LAST_ADMIN" });
  });

  test("demote admin terakhir → operator → LAST_ADMIN", async () => {
    const repo = fakeRepo({
      getWithOutlets: mock(async () => user()),
      countActiveAdmins: mock(async () => 1),
    });
    const svc = createUserService(repo, fakeHash);
    await expect(
      svc.update("c1", "u1", { role: "operator" }),
    ).rejects.toMatchObject({ code: "LAST_ADMIN" });
  });

  test("masih ada admin lain → boleh hapus", async () => {
    const repo = fakeRepo({
      getWithOutlets: mock(async () => user()),
      countActiveAdmins: mock(async () => 2),
    });
    const svc = createUserService(repo, fakeHash);
    await svc.remove("c1", "u1");
    expect(repo.remove).toHaveBeenCalledWith("c1", "u1");
  });

  test("user bukan admin → tanpa guard", async () => {
    const repo = fakeRepo({
      getWithOutlets: mock(async () => user({ role: "operator" })),
      countActiveAdmins: mock(async () => 1),
    });
    const svc = createUserService(repo, fakeHash);
    await svc.remove("c1", "u1");
    expect(repo.remove).toHaveBeenCalled();
  });
});
