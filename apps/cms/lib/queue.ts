// Client API panel operator (Call & Skip) + snapshot antrian.
import { api } from "./api";
import { getToken } from "./auth";

export type TicketStatus =
  | "WAITING"
  | "CALLED"
  | "SERVING"
  | "COMPLETED"
  | "SKIPPED";

export type PlatformBrief = { id: string; code: string; name: string };

export type QueueItem = {
  id: string;
  platform_id: string;
  number: number;
  label: string;
  status: TicketStatus;
  call_count: number;
};

export type QueueSnapshot = {
  platforms: PlatformBrief[];
  tickets: QueueItem[];
};

export type OutletRef = { id: string; name: string };

export type TicketAction = "call" | "serve" | "complete" | "skip";

const t = () => getToken();

export const queueApi = {
  myOutlets: () => api.get<OutletRef[]>("/me/outlets", t()),
  snapshot: (outletId: string) =>
    api.get<QueueSnapshot>(`/outlets/${outletId}/queue`, t()),
  act: (ticketId: string, action: TicketAction) =>
    api.post<QueueItem>(`/tickets/${ticketId}/${action}`, {}, t()),
};
