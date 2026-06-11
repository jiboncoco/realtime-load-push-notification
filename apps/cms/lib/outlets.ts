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

export type DayHours = {
  weekday: number; // 0=Min..6=Sab
  is_closed: boolean;
  open_time: string | null; // "HH:MM:SS"
  close_time: string | null;
};

// Field status yang ditambahkan backend (computeOpen).
export type OutletStatus = {
  code_display: string; // "K7Q-9PT"
  open: boolean;
  open_reason:
    | "OPEN"
    | "NO_SCHEDULE"
    | "MANUAL_CLOSED"
    | "DAY_CLOSED"
    | "BEFORE_OPEN"
    | "AFTER_CLOSE";
  today_hours: DayHours | null;
};

export type Outlet = {
  id: string;
  client_id: string;
  name: string;
  code: string;
  accepting: boolean;
  address: string | null;
  created_at: string;
  hours: DayHours[];
} & OutletStatus;

export type OutletWithPlatforms = Outlet & { platforms: Platform[] };

export type NewPlatform = { code: string; name: string };

const t = () => getToken();

export const outletsApi = {
  list: () => api.get<Outlet[]>("/outlets", t()),

  get: (id: string) => api.get<OutletWithPlatforms>(`/outlets/${id}`, t()),

  create: (input: { name: string; address?: string; platforms: NewPlatform[] }) =>
    api.post<OutletWithPlatforms>("/outlets", input, t()),

  update: (
    id: string,
    patch: { name?: string; address?: string | null; accepting?: boolean },
  ) => api.patch<Outlet>(`/outlets/${id}`, patch, t()),

  setHours: (id: string, hours: DayHours[]) =>
    api.put<DayHours[]>(`/outlets/${id}/hours`, { hours }, t()),

  remove: (id: string) => api.del<{ deleted: boolean }>(`/outlets/${id}`, t()),

  addPlatform: (outletId: string, input: NewPlatform) =>
    api.post<Platform>(`/outlets/${outletId}/platforms`, input, t()),

  updatePlatform: (platformId: string, patch: { code?: string; name?: string }) =>
    api.patch<Platform>(`/platforms/${platformId}`, patch, t()),

  removePlatform: (platformId: string) =>
    api.del<{ deleted: boolean }>(`/platforms/${platformId}`, t()),
};
