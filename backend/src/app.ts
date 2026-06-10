// Hono app: mount routes per domain + error handler global yang menerjemahkan
// AppError → { data, error } (CLAUDE.md §4).
import { Hono } from "hono";
import { cors } from "hono/cors";
import { AppError, Errors, fail } from "./lib/response.ts";
import { authRoutes } from "./auth/auth.routes.ts";
import { outletRoutes, platformRoutes } from "./outlets/outlet.routes.ts";
import { userRoutes } from "./users/user.routes.ts";
import { ticketRoutes } from "./tickets/ticket.routes.ts";
import { ticketOpsRoutes } from "./tickets/ticketops.routes.ts";
import { pushRoutes } from "./push/push.routes.ts";

export const app = new Hono();

app.use("*", cors()); // dev: izinkan CMS (localhost) memanggil API.

app.get("/health", (c) => c.json({ data: { status: "ok" }, error: null }));

app.route("/auth", authRoutes);
app.route("/outlets", outletRoutes);
app.route("/platforms", platformRoutes);
app.route("/users", userRoutes);
// Customer-facing (publik): POST /outlets/:id/tickets, GET /tickets/:id
app.route("/", ticketRoutes);
// Operator/admin (terproteksi): call/serve/complete/skip, queue, /me/outlets
app.route("/", ticketOpsRoutes);
// Web Push (publik): GET /push/vapid-public-key, POST /tickets/:id/push-subscribe
app.route("/", pushRoutes);

// Error handler global: AppError → response sentinel; sisanya → 500 generik.
app.onError((err, c) => {
  if (err instanceof AppError) {
    return fail(c, err);
  }
  console.error("Unhandled error:", err);
  return fail(c, Errors.internal());
});

app.notFound((c) => fail(c, Errors.notFound("Endpoint")));
