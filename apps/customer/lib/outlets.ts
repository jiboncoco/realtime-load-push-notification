// Client API outlet publik (customer). Tanpa auth. Status buka/tutup dihitung
// backend (open + open_reason); customer tinggal pakai.
import { api } from "./api";

export type DayHours = {
  weekday: number;
  is_closed: boolean;
  open_time: string | null;
  close_time: string | null;
};

export type PublicOutlet = {
  id: string;
  code: string;
  code_display: string;
  name: string;
  address: string | null;
  accepting: boolean;
  open: boolean;
  open_reason:
    | "OPEN"
    | "NO_SCHEDULE"
    | "MANUAL_CLOSED"
    | "DAY_CLOSED"
    | "BEFORE_OPEN"
    | "AFTER_CLOSE";
  today_hours: DayHours | null;
  hours: DayHours[];
};

export const outletsApi = {
  list: () => api.get<PublicOutlet[]>("/outlets/public"),
  info: (id: string) => api.get<PublicOutlet>(`/outlets/${id}/info`),
  byCode: (code: string) =>
    api.get<PublicOutlet>(`/outlets/code/${encodeURIComponent(code)}`),
};

// "09:00:00" → "09:00"
const hhmm = (t: string | null) => (t ? t.slice(0, 5) : "");

// Teks jam hari ini untuk ditampilkan ke customer.
export function todayHoursLabel(o: PublicOutlet): string {
  const th = o.today_hours;
  if (!th) return "Buka 24 jam";
  if (th.is_closed) return "Libur hari ini";
  return `${hhmm(th.open_time)}–${hhmm(th.close_time)}`;
}
