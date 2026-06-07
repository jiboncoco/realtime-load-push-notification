// Routes User & Operator (CMS, role admin). Terproteksi JWT + role admin.
import { Hono } from "hono";
import { z } from "zod";
import { jsonBody } from "../lib/validate.ts";
import { requireAuth, requireRole, type AuthEnv } from "../auth/auth.middleware.ts";
import * as h from "./user.handler.ts";

const roleSchema = z.enum(["admin", "operator"]);
const outletIds = z.array(z.string().uuid());

const createUserSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
  name: z.string().trim().min(1).max(120),
  role: roleSchema,
  outlet_ids: outletIds.optional(),
});

const updateUserSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    role: roleSchema.optional(),
    is_active: z.boolean().optional(),
    password: z.string().min(8).max(128).optional(),
    outlet_ids: outletIds.optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), {
    message: "Tidak ada field untuk diubah.",
  });

export const userRoutes = new Hono<AuthEnv>();
userRoutes.use("*", requireAuth, requireRole("admin"));
userRoutes.get("/", h.listUsers);
userRoutes.post("/", jsonBody(createUserSchema), h.createUser);
userRoutes.get("/:id", h.getUser);
userRoutes.patch("/:id", jsonBody(updateUserSchema), h.updateUser);
userRoutes.delete("/:id", h.deleteUser);
