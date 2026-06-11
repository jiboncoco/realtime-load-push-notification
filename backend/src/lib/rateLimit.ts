// Rate limiting in-memory (fixed window) untuk endpoint publik (booking,
// push-subscribe) agar tak bisa di-spam. Cukup untuk 1 instance MVP; bila
// scale-out ke banyak instance, ganti ke store bersama (mis. Redis).
import type { MiddlewareHandler } from "hono";
import { Errors } from "./response.ts";

type Bucket = { count: number; resetAt: number };

// IP klien: di belakang Caddy pakai X-Forwarded-For; fallback header lain / "local".
function clientIp(c: Parameters<MiddlewareHandler>[0]): string {
  const xff = c.req.header("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return c.req.header("x-real-ip") ?? "local";
}

export function rateLimit(opts: {
  name: string; // pembeda bucket per rute
  windowMs: number;
  max: number; // maksimum request per window per IP
}): MiddlewareHandler {
  const buckets = new Map<string, Bucket>();

  return async (c, next) => {
    const now = Date.now();
    const key = `${opts.name}:${clientIp(c)}`;
    const b = buckets.get(key);

    if (!b || now >= b.resetAt) {
      buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
    } else {
      b.count++;
      if (b.count > opts.max) {
        const retry = Math.ceil((b.resetAt - now) / 1000);
        c.header("Retry-After", String(retry));
        throw Errors.tooManyRequests(
          `Terlalu banyak permintaan. Coba lagi dalam ${retry} detik.`,
        );
      }
    }

    // Bersihkan bucket kedaluwarsa sesekali agar memori tak menumpuk.
    if (buckets.size > 5000) {
      for (const [k, v] of buckets) if (now >= v.resetAt) buckets.delete(k);
    }

    await next();
  };
}
