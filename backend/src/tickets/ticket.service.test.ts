// Unit test Queue Engine — Booking. Util pure + alur service (repo di-fake).
// Keamanan race-condition diuji terpisah lewat skrip concurrency (DB nyata).
import { describe, expect, test, mock } from "bun:test";
import { formatLabel, wibDay } from "./ticket.label.ts";
import { createTicketService } from "./ticket.service.ts";
import type {
  TicketRepo,
  TicketWithPlatform,
} from "./ticket.repo.ts";

describe("formatLabel", () => {
  test("pad 3 digit", () => {
    expect(formatLabel("A", 1)).toBe("A-001");
    expect(formatLabel("A", 12)).toBe("A-012");
    expect(formatLabel("B", 123)).toBe("B-123");
  });
  test("nomor >999 tanpa pad", () => {
    expect(formatLabel("C", 1000)).toBe("C-1000");
  });
});

describe("wibDay", () => {
  test("format YYYY-MM-DD", () => {
    expect(wibDay(new Date("2026-06-08T03:00:00Z"))).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
  test("batas hari mengikuti WIB (UTC+7)", () => {
    // 2026-06-07 18:00Z = 2026-06-08 01:00 WIB → harus tanggal 8.
    expect(wibDay(new Date("2026-06-07T18:00:00Z"))).toBe("2026-06-08");
    // 2026-06-07 16:59Z = 2026-06-07 23:59 WIB → masih tanggal 7.
    expect(wibDay(new Date("2026-06-07T16:59:00Z"))).toBe("2026-06-07");
  });
});

const ticket = (over: Partial<TicketWithPlatform> = {}): TicketWithPlatform => ({
  id: "t1",
  outlet_id: "o1",
  platform_id: "p1",
  number: 1,
  label: "A-001",
  status: "WAITING",
  created_at: "now",
  platform: { id: "p1", code: "A", name: "Kasir A" },
  ...over,
});

describe("ticketService", () => {
  test("book meneruskan device_token & mengembalikan tiket dari repo", async () => {
    const repo: TicketRepo = {
      book: mock(async (outletId: string, dt: string | null) =>
        ticket({ outlet_id: outletId, ...(dt ? {} : {}) }),
      ),
      getView: mock(async () => null),
    };
    const svc = createTicketService(repo);
    const result = await svc.book("o9", "dev-123");
    expect(result.label).toBe("A-001");
    expect(repo.book).toHaveBeenCalledWith("o9", "dev-123");
  });

  test("getStatus melempar NOT_FOUND bila tiket tak ada", async () => {
    const repo: TicketRepo = {
      book: mock(async () => ticket()),
      getView: mock(async () => null),
    };
    const svc = createTicketService(repo);
    await expect(svc.getStatus("nope")).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  test("getStatus mengembalikan view + ahead", async () => {
    const repo: TicketRepo = {
      book: mock(async () => ticket()),
      getView: mock(async () => ({ ...ticket(), ahead: 3 })),
    };
    const svc = createTicketService(repo);
    const view = await svc.getStatus("t1");
    expect(view.ahead).toBe(3);
  });
});
