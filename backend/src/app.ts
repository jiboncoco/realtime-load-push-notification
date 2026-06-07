// Hono app: mount routes per domain + error handler global yang menerjemahkan
// AppError → { data, error } (CLAUDE.md §4).
import { Hono } from "hono";
import { cors } from "hono/cors";
import { AppError, Errors, fail } from "./lib/response.ts";
import { authRoutes } from "./auth/auth.routes.ts";

export const app = new Hono();

app.use("*", cors()); // dev: izinkan CMS (localhost) memanggil API.

app.get("/health", (c) => c.json({ data: { status: "ok" }, error: null }));

app.route("/auth", authRoutes);

// Error handler global: AppError → response sentinel; sisanya → 500 generik.
app.onError((err, c) => {
  if (err instanceof AppError) {
    return fail(c, err);
  }
  console.error("Unhandled error:", err);
  return fail(c, Errors.internal());
});

app.notFound((c) => fail(c, Errors.notFound("Endpoint")));
