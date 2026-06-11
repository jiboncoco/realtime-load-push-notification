// Routes Queue Engine — Booking (customer-facing, PUBLIK). TIDAK memakai
// middleware admin. Mount di app.ts via app.route("/", ticketRoutes).
import { Hono } from "hono";
import { z } from "zod";
import { jsonBody } from "../lib/validate.ts";
import { rateLimit } from "../lib/rateLimit.ts";
import { bookTicket, getDisplay, getTicket } from "./ticket.handler.ts";

const bookSchema = z.object({
  device_token: z.string().trim().min(1).max(200).nullish(),
});

export const ticketRoutes = new Hono();

// Anti-spam booking: maks 10 ambil-nomor per menit per IP.
const bookLimiter = rateLimit({ name: "book", windowMs: 60_000, max: 10 });

// Ambil antrian: pilih outlet → auto-assign platform → nomor.
ticketRoutes.post("/outlets/:id/tickets", bookLimiter, jsonBody(bookSchema), bookTicket);

// Status tiket + sisa di depan.
ticketRoutes.get("/tickets/:id", getTicket);

// Data layar TV per outlet (publik, read-only).
ticketRoutes.get("/outlets/:id/display", getDisplay);
