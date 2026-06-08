// Client API antrian (publik). Booking & status.
import { api } from "./api";
import { getDeviceToken } from "./device";

export type TicketStatus =
  | "WAITING"
  | "CALLED"
  | "SERVING"
  | "COMPLETED"
  | "SKIPPED";

export type PlatformBrief = { id: string; code: string; name: string };

export type Ticket = {
  id: string;
  outlet_id: string;
  platform_id: string;
  number: number;
  label: string;
  status: TicketStatus;
  created_at: string;
  platform: PlatformBrief;
};

export type TicketStatusView = Ticket & { ahead: number };

export const ticketApi = {
  book: (outletId: string) =>
    api.post<Ticket>(`/outlets/${outletId}/tickets`, {
      device_token: getDeviceToken(),
    }),
  status: (ticketId: string) =>
    api.get<TicketStatusView>(`/tickets/${ticketId}`),
};
