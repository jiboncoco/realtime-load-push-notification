// Unit test Call & Skip: state machine pure + alur service (scoping, conflict).
import { describe, expect, test, mock } from "bun:test";
import { nextState } from "./ticket.actions.ts";
import { createTicketOpsService } from "./ticketops.service.ts";
import type { ActionTicket, TicketOpsRepo } from "./ticketops.repo.ts";
import type { SessionClaims } from "../lib/jwt.ts";

describe("nextState (state machine)", () => {
  test("call WAITING → CALLED, call_count++ , touch called_at", () => {
    expect(nextState("call", { status: "WAITING", call_count: 0 })).toMatchObject({
      status: "CALLED",
      call_count: 1,
      touchCalledAt: true,
    });
  });
  test("call ulang dari CALLED menaikkan call_count", () => {
    expect(nextState("call", { status: "CALLED", call_count: 2 }).call_count).toBe(3);
  });
  test("serve CALLED → SERVING", () => {
    expect(nextState("serve", { status: "CALLED", call_count: 1 }).status).toBe("SERVING");
  });
  test("complete SERVING → COMPLETED, touch completed_at", () => {
    expect(nextState("complete", { status: "SERVING", call_count: 1 })).toMatchObject({
      status: "COMPLETED",
      touchCompletedAt: true,
    });
  });
  test("skip dengan call_count<3 → SKIP_NOT_ALLOWED", () => {
    expect(() => nextState("skip", { status: "CALLED", call_count: 2 })).toThrow();
    try {
      nextState("skip", { status: "CALLED", call_count: 2 });
    } catch (e: any) {
      expect(e.code).toBe("SKIP_NOT_ALLOWED");
    }
  });
  test("skip dengan call_count>=3 → SKIPPED", () => {
    expect(nextState("skip", { status: "CALLED", call_count: 3 }).status).toBe("SKIPPED");
  });
  test("transisi tak valid (serve dari WAITING) → INVALID_TRANSITION", () => {
    try {
      nextState("serve", { status: "WAITING", call_count: 0 });
    } catch (e: any) {
      expect(e.code).toBe("INVALID_TRANSITION");
    }
  });
  test("complete dari CALLED tak valid", () => {
    expect(() => nextState("complete", { status: "CALLED", call_count: 1 })).toThrow();
  });
});

const adminClaims: SessionClaims = { sub: "u-admin", client_id: "c1", role: "admin" };
const opClaims: SessionClaims = { sub: "u-op", client_id: "c1", role: "operator" };

const actionTicket = (over: Partial<ActionTicket> = {}): ActionTicket => ({
  id: "t1",
  outlet_id: "o1",
  platform_id: "p1",
  number: 1,
  label: "A-001",
  status: "CALLED",
  call_count: 1,
  platform: { id: "p1", code: "A", name: "Kasir A" },
  ...over,
});

function repo(over: Partial<TicketOpsRepo> = {}): TicketOpsRepo {
  return {
    getOutletAccess: mock(async () => ({ client_id: "c1" })),
    isOperatorAssigned: mock(async () => true),
    accessibleOutlets: mock(async () => []),
    findForAction: mock(async () => ({
      id: "t1",
      outlet_id: "o1",
      status: "WAITING" as const,
      call_count: 0,
    })),
    applyAction: mock(async () => actionTicket()),
    queue: mock(async () => ({ platforms: [], tickets: [] })),
    ...over,
  };
}

describe("ticketOpsService scoping", () => {
  test("outlet lintas-tenant → NOT_FOUND", async () => {
    const svc = createTicketOpsService(
      repo({ getOutletAccess: mock(async () => ({ client_id: "OTHER" })) }),
    );
    await expect(svc.act(adminClaims, "t1", "call")).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  test("operator tak di-assign → FORBIDDEN", async () => {
    const svc = createTicketOpsService(
      repo({ isOperatorAssigned: mock(async () => false) }),
    );
    await expect(svc.act(opClaims, "t1", "call")).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  test("admin boleh call → meneruskan ke repo.applyAction", async () => {
    const r = repo();
    const svc = createTicketOpsService(r);
    const result = await svc.act(adminClaims, "t1", "call");
    expect(result.status).toBe("CALLED");
    expect(r.applyAction).toHaveBeenCalledTimes(1);
  });

  test("applyAction null (status berubah) → CONFLICT", async () => {
    const svc = createTicketOpsService(
      repo({ applyAction: mock(async () => null) }),
    );
    await expect(svc.act(adminClaims, "t1", "call")).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });

  test("act tiket tak ada → NOT_FOUND", async () => {
    const svc = createTicketOpsService(
      repo({ findForAction: mock(async () => null) }),
    );
    await expect(svc.act(adminClaims, "x", "call")).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});
