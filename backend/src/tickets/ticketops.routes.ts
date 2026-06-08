// Routes operasi operator (CMS). Terproteksi JWT; admin & operator boleh,
// scoping per-outlet ditegakkan di service. Mount di app.ts via app.route("/").
import { Hono } from "hono";
import { requireAuth, type AuthEnv } from "../auth/auth.middleware.ts";
import {
  actionHandler,
  getQueue,
  listMyOutlets,
} from "./ticketops.handler.ts";

// requireAuth dipasang PER-ROUTE (bukan use("*")) karena router ini di-mount
// di "/" — wildcard akan menelan route booking publik (/outlets/:id/tickets,
// /tickets/:id) yang justru harus tetap tanpa auth.
export const ticketOpsRoutes = new Hono<AuthEnv>();

// Outlet yang bisa diakses aktor (admin: semua di client; operator: assigned).
ticketOpsRoutes.get("/me/outlets", requireAuth, listMyOutlets);

// Snapshot antrian aktif outlet (untuk panel operator / monitor).
ticketOpsRoutes.get("/outlets/:id/queue", requireAuth, getQueue);

// Aksi state machine.
ticketOpsRoutes.post("/tickets/:id/call", requireAuth, actionHandler("call"));
ticketOpsRoutes.post("/tickets/:id/serve", requireAuth, actionHandler("serve"));
ticketOpsRoutes.post("/tickets/:id/complete", requireAuth, actionHandler("complete"));
ticketOpsRoutes.post("/tickets/:id/skip", requireAuth, actionHandler("skip"));
