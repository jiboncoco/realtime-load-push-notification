// Routes Queue Engine — Booking (customer-facing, PUBLIK). TIDAK memakai
// middleware admin. Mount di app.ts via app.route("/", ticketRoutes).
import { Hono } from "hono";
import { z } from "zod";
import { jsonBody } from "../lib/validate.ts";
import { bookTicket, getTicket } from "./ticket.handler.ts";

const bookSchema = z.object({
  device_token: z.string().trim().min(1).max(200).nullish(),
});

export const ticketRoutes = new Hono();

// Ambil antrian: pilih outlet → auto-assign platform → nomor.
ticketRoutes.post("/outlets/:id/tickets", jsonBody(bookSchema), bookTicket);

// Status tiket + sisa di depan.
ticketRoutes.get("/tickets/:id", getTicket);
