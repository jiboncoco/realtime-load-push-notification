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
  })
  .refine((v) => v.name !== undefined || v.address !== undefined, {
    message: "Tidak ada field untuk diubah.",
  });

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
outletRoutes.get("/", ...admin, h.listOutlets);
outletRoutes.post("/", ...admin, jsonBody(createOutletSchema), h.createOutlet);
outletRoutes.get("/:id", ...admin, h.getOutlet);
outletRoutes.patch("/:id", ...admin, jsonBody(updateOutletSchema), h.updateOutlet);
outletRoutes.delete("/:id", ...admin, h.deleteOutlet);
outletRoutes.post("/:id/platforms", ...admin, jsonBody(platformSchema), h.addPlatform);

// Endpoint platform langsung: /platforms/:id
export const platformRoutes = new Hono<AuthEnv>();
platformRoutes.use("*", requireAuth, requireRole("admin"));
platformRoutes.patch("/:id", jsonBody(updatePlatformSchema), h.updatePlatform);
platformRoutes.delete("/:id", h.deletePlatform);
