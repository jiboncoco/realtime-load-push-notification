// Client API modul User & Operator. Token JWT diselipkan dari sesi (auth.ts).
import { api } from "./api";
import { getToken } from "./auth";

export type UserRole = "admin" | "operator";

export type ManagedUser = {
  id: string;
  client_id: string;
  email: string;
  role: UserRole;
  name: string;
  is_active: boolean;
  created_at: string;
  outlet_ids: string[];
};

export type CreateUserInput = {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  outlet_ids?: string[];
};

export type UpdateUserInput = {
  name?: string;
  role?: UserRole;
  is_active?: boolean;
  password?: string;
  outlet_ids?: string[];
};

const t = () => getToken();

export const usersApi = {
  list: () => api.get<ManagedUser[]>("/users", t()),
  get: (id: string) => api.get<ManagedUser>(`/users/${id}`, t()),
  create: (input: CreateUserInput) =>
    api.post<ManagedUser>("/users", input, t()),
  update: (id: string, patch: UpdateUserInput) =>
    api.patch<ManagedUser>(`/users/${id}`, patch, t()),
  remove: (id: string) => api.del<{ deleted: boolean }>(`/users/${id}`, t()),
};
