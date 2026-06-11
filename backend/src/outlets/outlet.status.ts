// Status buka/tutup outlet — PURE & DIHITUNG (tanpa cron). Status efektif =
// accepting AND dalam jam operasional WIB hari ini. Lihat migrasi 004.

export type DayHours = {
  weekday: number; // 0=Minggu .. 6=Sabtu (EXTRACT(DOW)/Date.getDay)
  is_closed: boolean;
  open_time: string | null; // "HH:MM:SS" (PG time)
  close_time: string | null;
};

export type OpenStatus = {
  open: boolean;
  reason:
    | "OPEN"
    | "NO_SCHEDULE" // tak ada jadwal hari ini → buka (selama accepting)
    | "MANUAL_CLOSED" // ditutup manual (accepting=false)
    | "DAY_CLOSED" // hari libur rutin
    | "BEFORE_OPEN"
    | "AFTER_CLOSE";
  today: DayHours | null;
};

const WEEKDAY: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

// Hari (0-6) + menit-sejak-tengah-malam, dalam zona WIB.
export function wibNowParts(now: Date = new Date()): {
  weekday: number;
  minutes: number;
} {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const weekday = WEEKDAY[get("weekday")] ?? 0;
  const minutes = Number(get("hour")) * 60 + Number(get("minute"));
  return { weekday, minutes };
}

function toMinutes(time: string): number {
  const [h, m] = time.split(":");
  return Number(h) * 60 + Number(m);
}

export function computeOpen(
  accepting: boolean,
  hours: DayHours[],
  now: Date = new Date(),
): OpenStatus {
  const { weekday, minutes } = wibNowParts(now);
  const today = hours.find((h) => h.weekday === weekday) ?? null;

  if (!accepting) return { open: false, reason: "MANUAL_CLOSED", today };
  if (!today) return { open: true, reason: "NO_SCHEDULE", today: null };
  if (today.is_closed) return { open: false, reason: "DAY_CLOSED", today };

  const o = toMinutes(today.open_time!);
  const c = toMinutes(today.close_time!);
  if (minutes < o) return { open: false, reason: "BEFORE_OPEN", today };
  if (minutes >= c) return { open: false, reason: "AFTER_CLOSE", today };
  return { open: true, reason: "OPEN", today };
}
