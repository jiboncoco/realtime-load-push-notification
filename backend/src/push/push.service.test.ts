// Unit test Web Push service: guard subscribe, fanout multi-perangkat,
// cleanup endpoint gone, grouping reminder "sisa 3" per tiket. Sender di-stub
// (tanpa jaringan); repo palsu (tanpa DB).
import { describe, expect, test, mock } from "bun:test";
import { createPushService } from "./push.service.ts";
import type { PushRepo, TargetRow } from "./push.repo.ts";
import type { PushTarget, SendResult } from "./push.sender.ts";

function fakeRepo(over: Partial<PushRepo> = {}): PushRepo {
  return {
    ticketExists: async () => true,
    saveSubscription: async () => {},
    removeTarget: async () => {},
    targetsForTicket: async () => [],
    claimRemindThree: async () => [],
    ...over,
  };
}

const target = (endpoint: string): PushTarget => ({
  endpoint,
  p256dh: "p",
  auth: "a",
});

describe("pushService.subscribe", () => {
  test("tiket tidak ada → 404", async () => {
    const svc = createPushService(fakeRepo({ ticketExists: async () => false }));
    expect(svc.subscribe("t1", target("https://e/1"))).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  test("tiket ada → simpan subscription", async () => {
    const save = mock(async () => {});
    const svc = createPushService(fakeRepo({ saveSubscription: save }));
    await svc.subscribe("t1", target("https://e/1"));
    expect(save).toHaveBeenCalledTimes(1);
  });
});

describe("pushService.notifyReady", () => {
  test("kirim ke semua perangkat tiket", async () => {
    const send = mock(async (): Promise<SendResult> => ({ ok: true }));
    const svc = createPushService(
      fakeRepo({
        targetsForTicket: async () => [target("https://e/1"), target("https://e/2")],
      }),
      send,
    );
    await svc.notifyReady({ id: "t1", label: "A-001", platformName: "Loket A" });
    expect(send).toHaveBeenCalledTimes(2);
  });

  test("tanpa subscription → tidak kirim", async () => {
    const send = mock(async (): Promise<SendResult> => ({ ok: true }));
    const svc = createPushService(fakeRepo({ targetsForTicket: async () => [] }), send);
    await svc.notifyReady({ id: "t1", label: "A-001", platformName: "Loket A" });
    expect(send).not.toHaveBeenCalled();
  });

  test("endpoint gone (410) → dibersihkan", async () => {
    const remove = mock(async () => {});
    const send = mock(async (): Promise<SendResult> => ({ ok: false, gone: true }));
    const svc = createPushService(
      fakeRepo({ targetsForTicket: async () => [target("https://dead/1")], removeTarget: remove }),
      send,
    );
    await svc.notifyReady({ id: "t1", label: "A-001", platformName: "Loket A" });
    expect(remove).toHaveBeenCalledWith("t1", "https://dead/1");
  });
});

describe("pushService.notifyRemindThree", () => {
  test("kirim 1 payload per tiket, grouping multi-perangkat", async () => {
    const rows: TargetRow[] = [
      { ticket_id: "t1", endpoint: "https://e/1a", p256dh: "p", auth: "a", label: "A-005", platform_name: "Loket A" },
      { ticket_id: "t1", endpoint: "https://e/1b", p256dh: "p", auth: "a", label: "A-005", platform_name: "Loket A" },
      { ticket_id: "t2", endpoint: "https://e/2", p256dh: "p", auth: "a", label: "A-006", platform_name: "Loket A" },
    ];
    const sent: { endpoint: string; tag?: string }[] = [];
    const send = mock(async (t: PushTarget, p): Promise<SendResult> => {
      sent.push({ endpoint: t.endpoint, tag: p.tag });
      return { ok: true };
    });
    const svc = createPushService(fakeRepo({ claimRemindThree: async () => rows }), send);
    await svc.notifyRemindThree("plat-1");
    expect(send).toHaveBeenCalledTimes(3); // 2 perangkat t1 + 1 t2
    expect(sent.filter((s) => s.tag === "ticket-t1")).toHaveLength(2);
    expect(sent.filter((s) => s.tag === "ticket-t2")).toHaveLength(1);
  });

  test("tidak ada yang perlu di-reminder → no-op", async () => {
    const send = mock(async (): Promise<SendResult> => ({ ok: true }));
    const svc = createPushService(fakeRepo({ claimRemindThree: async () => [] }), send);
    await svc.notifyRemindThree("plat-1");
    expect(send).not.toHaveBeenCalled();
  });
});
