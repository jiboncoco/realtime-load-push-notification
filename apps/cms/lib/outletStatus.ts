// Label status & hari (dipakai badge buka/tutup + editor jam CMS).
import type { OutletStatus } from "./outlets";

export const DAY_NAMES = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

export function openReasonLabel(reason: OutletStatus["open_reason"]): string {
  switch (reason) {
    case "OPEN":
      return "Buka";
    case "NO_SCHEDULE":
      return "Buka (tanpa jadwal)";
    case "MANUAL_CLOSED":
      return "Ditutup manual";
    case "DAY_CLOSED":
      return "Libur hari ini";
    case "BEFORE_OPEN":
      return "Belum jam buka";
    case "AFTER_CLOSE":
      return "Sudah jam tutup";
  }
}

// "09:00:00" → "09:00"
export function hhmm(time: string | null): string {
  return time ? time.slice(0, 5) : "";
}
