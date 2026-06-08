// State machine Call & Skip (TDD §4.2) — logika transisi PURE (mudah diuji).
//   WAITING ──call──► CALLED ──serve──► SERVING ──complete──► COMPLETED
//                       └──call (ulang, call_count++)
//   skip (guard call_count ≥ 3) ──► SKIPPED
import { Errors } from "../lib/response.ts";
import type { TicketStatusValue } from "./ticket.repo.ts";

export type TicketAction = "call" | "serve" | "complete" | "skip";

export type NextState = {
  status: TicketStatusValue;
  call_count: number;
  touchCalledAt: boolean; // set called_at = now()
  touchCompletedAt: boolean; // set completed_at = now()
};

export const SKIP_MIN_CALLS = 3;

// Hitung state berikut atau lempar AppError (409) bila transisi tak valid.
export function nextState(
  action: TicketAction,
  current: { status: TicketStatusValue; call_count: number },
): NextState {
  const base = {
    call_count: current.call_count,
    touchCalledAt: false,
    touchCompletedAt: false,
  };

  switch (action) {
    case "call":
      if (current.status === "WAITING" || current.status === "CALLED") {
        return {
          ...base,
          status: "CALLED",
          call_count: current.call_count + 1,
          touchCalledAt: true,
        };
      }
      break;
    case "serve":
      if (current.status === "CALLED") {
        return { ...base, status: "SERVING" };
      }
      break;
    case "complete":
      if (current.status === "SERVING") {
        return { ...base, status: "COMPLETED", touchCompletedAt: true };
      }
      break;
    case "skip":
      if (current.status === "WAITING" || current.status === "CALLED") {
        if (current.call_count < SKIP_MIN_CALLS) {
          throw Errors.conflict(
            "SKIP_NOT_ALLOWED",
            `Skip hanya boleh setelah dipanggil ≥${SKIP_MIN_CALLS} kali.`,
          );
        }
        return { ...base, status: "SKIPPED" };
      }
      break;
  }

  throw Errors.conflict(
    "INVALID_TRANSITION",
    `Tidak bisa '${action}' dari status ${current.status}.`,
  );
}
