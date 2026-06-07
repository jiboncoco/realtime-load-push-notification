// Client API modul Outlet & Platform. Token JWT diselipkan dari sesi (auth.ts).
import { api } from "./api";
import { getToken } from "./auth";

export type Platform = {
  id: string;
  outlet_id: string;
  code: string;
  name: string;
  created_at: string;
};

export type Outlet = {
  id: string;
  client_id: string;
  name: string;
  address: string | null;
  created_at: string;
};

export type OutletWithPlatforms = Outlet & { platforms: Platform[] };

export type NewPlatform = { code: string; name: string };

const t = () => getToken();

export const outletsApi = {
  list: () => api.get<Outlet[]>("/outlets", t()),

  get: (id: string) => api.get<OutletWithPlatforms>(`/outlets/${id}`, t()),

  create: (input: { name: string; address?: string; platforms: NewPlatform[] }) =>
    api.post<OutletWithPlatforms>("/outlets", input, t()),

  update: (id: string, patch: { name?: string; address?: string | null }) =>
    api.patch<Outlet>(`/outlets/${id}`, patch, t()),

  remove: (id: string) => api.del<{ deleted: boolean }>(`/outlets/${id}`, t()),

  addPlatform: (outletId: string, input: NewPlatform) =>
    api.post<Platform>(`/outlets/${outletId}/platforms`, input, t()),

  updatePlatform: (platformId: string, patch: { code?: string; name?: string }) =>
    api.patch<Platform>(`/platforms/${platformId}`, patch, t()),

  removePlatform: (platformId: string) =>
    api.del<{ deleted: boolean }>(`/platforms/${platformId}`, t()),
};
