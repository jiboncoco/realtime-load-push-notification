// Konvensi response { data, error } + error sentinel (CLAUDE.md §4).
import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

export type ApiError = {
  code: string;
  message: string;
};

export type ApiResponse<T> =
  | { data: T; error: null }
  | { data: null; error: ApiError };

// Error sentinel: dilempar di service/repo, ditangkap error handler global (app.ts).
export class AppError extends Error {
  readonly code: string;
  readonly status: ContentfulStatusCode;

  constructor(code: string, message: string, status: ContentfulStatusCode) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
  }
}

// Sentinel umum yang dipakai lintas modul.
export const Errors = {
  invalidCredentials: () =>
    new AppError("INVALID_CREDENTIALS", "Email atau password salah.", 401),
  validation: (message: string) =>
    new AppError("VALIDATION_ERROR", message, 400),
  unauthorized: () =>
    new AppError("UNAUTHORIZED", "Tidak terautentikasi.", 401),
  forbidden: () => new AppError("FORBIDDEN", "Akses ditolak.", 403),
  notFound: (what = "Resource") =>
    new AppError("NOT_FOUND", `${what} tidak ditemukan.`, 404),
  internal: () =>
    new AppError("INTERNAL", "Terjadi kesalahan internal.", 500),
};

export function ok<T>(c: Context, data: T, status: ContentfulStatusCode = 200) {
  return c.json<ApiResponse<T>>({ data, error: null }, status);
}

export function fail(c: Context, err: AppError) {
  return c.json<ApiResponse<never>>(
    { data: null, error: { code: err.code, message: err.message } },
    err.status,
  );
}
