// Helper validasi JSON: zValidator + ubah error zod → AppError VALIDATION_ERROR
// agar konsisten dengan konvensi { data, error } (ditangkap onError di app.ts).
import { zValidator } from "@hono/zod-validator";
import type { ZodSchema } from "zod";
import { Errors } from "./response.ts";

export function jsonBody<T extends ZodSchema>(schema: T) {
  return zValidator("json", schema, (result) => {
    if (!result.success) {
      const first = result.error.issues[0];
      const path = first?.path.join(".");
      throw Errors.validation(
        path ? `${path}: ${first?.message}` : (first?.message ?? "Input tidak valid."),
      );
    }
  });
}
