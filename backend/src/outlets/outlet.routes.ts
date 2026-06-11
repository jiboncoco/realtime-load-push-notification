// Routes Outlet & Platform (CMS, role admin). Semua terproteksi JWT + role admin.
import { Hono } from "hono";
import { z } from "zod";
import { jsonBody } from "../lib/validate.ts";
import { requireAuth, requireRole, type AuthEnv } from "../auth/auth.middleware.ts";
import * as h from "./outlet.handler.ts";

// code platform: trim + uppercase (mis. "a" → "A"), unik per outlet (DB constraint).
const codeSchema = z
  .string()
  .trim()
  .min(1)
  .max(8)
  .transform((s) => s.toUpperCase());

const platformSchema = z.object({
  code: codeSchema,
  name: z.string().trim().min(1).max(80),
});

const createOutletSchema = z.object({
  name: z.string().trim().min(1).max(120),
  address: z.string().trim().max(255).nullish(),
  platforms: z.array(platformSchema).min(1), // wajib >=1 platform
});

const updateOutletSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    address: z.string().trim().max(255).nullable().optional(),
    accepting: z.boolean().optional(), // toggle buka/tutup manual
  })
  .refine(
    (v) =>
      v.name !== undefined || v.address !== undefined || v.accepting !== undefined,
    { message: "Tidak ada field untuk diubah." },
  );

// Jam operasional: replace-all 0..7 hari. weekday 0=Min..6=Sab.
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;
const dayHoursSchema = z
  .object({
    weekday: z.number().int().min(0).max(6),
    is_closed: z.boolean(),
    open_time: z.string().regex(TIME_RE).nullish(),
    close_time: z.string().regex(TIME_RE).nullish(),
  })
  .refine(
    (d) =>
      d.is_closed ||
      (!!d.open_time && !!d.close_time && d.open_time < d.close_time),
    { message: "Jam buka harus lebih awal dari jam tutup." },
  );
const setHoursSchema = z
  .object({ hours: z.array(dayHoursSchema).max(7) })
  .refine(
    (v) => new Set(v.hours.map((h) => h.weekday)).size === v.hours.length,
    { message: "Hari duplikat dalam jadwal." },
  );

const updatePlatformSchema = z
  .object({
    code: codeSchema.optional(),
    name: z.string().trim().min(1).max(80).optional(),
  })
  .refine((v) => v.code !== undefined || v.name !== undefined, {
    message: "Tidak ada field untuk diubah.",
  });

// Endpoint berbasis outlet: /outlets...
// Middleware admin dipasang PER-ROUTE (bukan use("*")) supaya tidak menelan
// route publik POST /outlets/:id/tickets (booking customer) yang berbagi prefix.
const admin = [requireAuth, requireRole("admin")] as const;

export const outletRoutes = new Hono<AuthEnv>();

// Publik (customer, TANPA auth). Segmen statis (/public, /code) diprioritaskan
// di atas /:id oleh router Hono, jadi tak bentrok dengan route admin.
outletRoutes.get("/public", h.listPublicOutlets);
outletRoutes.get("/code/:code", h.getOutletByCode);
outletRoutes.get("/:id/info", h.getOutletInfo);

// Admin (JWT + role admin), per-route agar tak menelan booking publik.
outletRoutes.get("/", ...admin, h.listOutlets);
outletRoutes.post("/", ...admin, jsonBody(createOutletSchema), h.createOutlet);
outletRoutes.get("/:id", ...admin, h.getOutlet);
outletRoutes.patch("/:id", ...admin, jsonBody(updateOutletSchema), h.updateOutlet);
outletRoutes.put("/:id/hours", ...admin, jsonBody(setHoursSchema), h.setOutletHours);
outletRoutes.delete("/:id", ...admin, h.deleteOutlet);
outletRoutes.post("/:id/platforms", ...admin, jsonBody(platformSchema), h.addPlatform);

// Endpoint platform langsung: /platforms/:id
export const platformRoutes = new Hono<AuthEnv>();
platformRoutes.use("*", requireAuth, requireRole("admin"));
platformRoutes.patch("/:id", jsonBody(updatePlatformSchema), h.updatePlatform);
platformRoutes.delete("/:id", h.deletePlatform);
