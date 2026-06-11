// Unit test status buka/tutup (pure). WIB = UTC+7; pakai instant UTC tetap.
import { describe, expect, test } from "bun:test";
import { computeOpen, wibNowParts, type DayHours } from "./outlet.status.ts";

// 2026-06-10 Rabu. UTC 03:00 → WIB 10:00 (weekday 3).
const WED_10AM = new Date("2026-06-10T03:00:00Z");

const day = (over: Partial<DayHours> = {}): DayHours => ({
  weekday: 3,
  is_closed: false,
  open_time: "09:00:00",
  close_time: "17:00:00",
  ...over,
});

describe("wibNowParts", () => {
  test("UTC 03:00 Rabu → WIB 10:00, weekday 3", () => {
    expect(wibNowParts(WED_10AM)).toEqual({ weekday: 3, minutes: 600 });
  });
});

describe("computeOpen", () => {
  test("accepting=false → MANUAL_CLOSED (abaikan jam)", () => {
    expect(computeOpen(false, [day()], WED_10AM)).toMatchObject({
      open: false,
      reason: "MANUAL_CLOSED",
    });
  });

  test("tanpa jadwal hari ini → NO_SCHEDULE (buka)", () => {
    expect(computeOpen(true, [], WED_10AM)).toMatchObject({
      open: true,
      reason: "NO_SCHEDULE",
    });
  });

  test("hari libur rutin → DAY_CLOSED", () => {
    expect(computeOpen(true, [day({ is_closed: true })], WED_10AM)).toMatchObject({
      open: false,
      reason: "DAY_CLOSED",
    });
  });

  test("dalam jam (09:00-17:00) @10:00 → OPEN", () => {
    expect(computeOpen(true, [day()], WED_10AM)).toMatchObject({
      open: true,
      reason: "OPEN",
    });
  });

  test("sebelum buka (11:00-17:00) → BEFORE_OPEN", () => {
    expect(computeOpen(true, [day({ open_time: "11:00:00" })], WED_10AM)).toMatchObject({
      open: false,
      reason: "BEFORE_OPEN",
    });
  });

  test("setelah tutup (08:00-09:30) → AFTER_CLOSE", () => {
    expect(
      computeOpen(true, [day({ open_time: "08:00:00", close_time: "09:30:00" })], WED_10AM),
    ).toMatchObject({ open: false, reason: "AFTER_CLOSE" });
  });

  test("jadwal hari lain tak memengaruhi hari ini → NO_SCHEDULE", () => {
    // hanya ada jadwal Senin(1); hari ini Rabu(3) → tak ada → buka.
    expect(computeOpen(true, [day({ weekday: 1 })], WED_10AM)).toMatchObject({
      open: true,
      reason: "NO_SCHEDULE",
    });
  });
});
