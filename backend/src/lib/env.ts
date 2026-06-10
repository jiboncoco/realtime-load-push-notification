// Baca & validasi environment sekali di startup. Gagal cepat bila config kurang.

function required(name: string): string {
  const v = process.env[name];
  if (!v || v.length === 0) {
    throw new Error(`Missing required env: ${name}`);
  }
  return v;
}

function optional(name: string, fallback: string): string {
  const v = process.env[name];
  return v && v.length > 0 ? v : fallback;
}

// VAPID untuk Web Push bersifat OPSIONAL: bila salah satu kunci kosong, push
// dinonaktifkan (booking/call tetap jalan). Lihat push/push.sender.ts.
const vapidPublic = optional("VAPID_PUBLIC_KEY", "");
const vapidPrivate = optional("VAPID_PRIVATE_KEY", "");

export const env = {
  port: Number(optional("PORT", "3001")),
  databaseUrl: required("DATABASE_URL"),
  jwtSecret: required("JWT_SECRET"),
  seed: {
    clientName: optional("SEED_CLIENT_NAME", "Demo Client"),
    adminEmail: optional("SEED_ADMIN_EMAIL", "admin@demo.test"),
    adminPassword: optional("SEED_ADMIN_PASSWORD", "admin12345"),
    adminName: optional("SEED_ADMIN_NAME", "Demo Admin"),
  },
  vapid:
    vapidPublic && vapidPrivate
      ? {
          publicKey: vapidPublic,
          privateKey: vapidPrivate,
          subject: optional("VAPID_SUBJECT", "mailto:admin@demo.test"),
        }
      : null,
} as const;
