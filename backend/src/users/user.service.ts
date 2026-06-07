// Service User & Operator. Aturan CLAUDE.md §6 + guard tambahan (disetujui):
// client harus selalu punya >=1 admin AKTIF (cegah lockout).
// Repo di-inject agar guard bisa diuji tanpa DB (user.service.test.ts).
import { Errors } from "../lib/response.ts";
import type { Role } from "../lib/jwt.ts";
import {
  userRepo,
  type UpdateUserData,
  type UserRepo,
  type UserWithOutlets,
} from "./user.repo.ts";

export type CreateUserInput = {
  email: string;
  password: string;
  name: string;
  role: Role;
  outlet_ids?: string[];
};

export type UpdateUserInput = {
  name?: string;
  role?: Role;
  is_active?: boolean;
  password?: string;
  outlet_ids?: string[];
};

// Abstraksi hashing agar service mudah diuji (default Bun.password native).
export type Hasher = (plain: string) => Promise<string>;
const defaultHasher: Hasher = (plain) => Bun.password.hash(plain);

const isActiveAdmin = (u: { role: Role; is_active: boolean }) =>
  u.role === "admin" && u.is_active;

export function createUserService(repo: UserRepo, hash: Hasher = defaultHasher) {
  // Lempar bila aksi membuat client kehilangan admin aktif terakhir.
  async function guardLastAdmin(clientId: string) {
    if ((await repo.countActiveAdmins(clientId)) <= 1) {
      throw Errors.conflict(
        "LAST_ADMIN",
        "Tidak bisa menghapus/menonaktifkan admin aktif terakhir.",
      );
    }
  }

  return {
    list: (clientId: string) => repo.list(clientId),

    async get(clientId: string, userId: string): Promise<UserWithOutlets> {
      const user = await repo.getWithOutlets(clientId, userId);
      if (!user) throw Errors.notFound("User");
      return user;
    },

    async create(clientId: string, input: CreateUserInput) {
      const passwordHash = await hash(input.password);
      // Admin tak pakai assignment; operator pakai outlet_ids (boleh kosong).
      const outletIds = input.role === "operator" ? (input.outlet_ids ?? []) : [];
      return repo.create(clientId, {
        email: input.email,
        passwordHash,
        name: input.name,
        role: input.role,
        outletIds,
      });
    },

    async update(clientId: string, userId: string, input: UpdateUserInput) {
      const current = await repo.getWithOutlets(clientId, userId);
      if (!current) throw Errors.notFound("User");

      const willRole = input.role ?? current.role;
      const willActive = input.is_active ?? current.is_active;
      // Jika user ini admin-aktif dan perubahan mencabut status itu → guard.
      if (
        isActiveAdmin(current) &&
        !isActiveAdmin({ role: willRole, is_active: willActive })
      ) {
        await guardLastAdmin(clientId);
      }

      const data: UpdateUserData = {
        name: input.name,
        role: input.role,
        is_active: input.is_active,
        outletIds: input.outlet_ids,
      };
      if (input.password) data.passwordHash = await hash(input.password);

      const updated = await repo.update(clientId, userId, data);
      if (!updated) throw Errors.notFound("User");
      return updated;
    },

    async remove(clientId: string, userId: string) {
      const current = await repo.getWithOutlets(clientId, userId);
      if (!current) throw Errors.notFound("User");
      if (isActiveAdmin(current)) {
        await guardLastAdmin(clientId);
      }
      await repo.remove(clientId, userId);
    },
  };
}

export type UserService = ReturnType<typeof createUserService>;

export const userService = createUserService(userRepo);
