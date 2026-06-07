// Routes Auth (TDD §5). Validasi input via zod, lalu delegasi ke handler.
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { AppError } from "../lib/response.ts";
import { loginHandler } from "./auth.handler.ts";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const authRoutes = new Hono();

authRoutes.post(
  "/login",
  zValidator("json", loginSchema, (result) => {
    if (!result.success) {
      throw new AppError("VALIDATION_ERROR", "Input tidak valid.", 400);
    }
  }),
  loginHandler,
);

// Stub Google OAuth (opsional, customer auth menyusul — TDD §1.4).
authRoutes.get("/google", (c) =>
  c.json({ data: null, error: { code: "NOT_IMPLEMENTED", message: "Google OAuth belum diimplementasi." } }, 501),
);
authRoutes.get("/google/callback", (c) =>
  c.json({ data: null, error: { code: "NOT_IMPLEMENTED", message: "Google OAuth belum diimplementasi." } }, 501),
);
