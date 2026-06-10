// Pengirim Web Push low-level: bungkus lib `web-push` (VAPID + enkripsi payload).
// VAPID dikonfigurasi sekali dari env; bila env.vapid null → push DINONAKTIFKAN
// (semua kirim jadi no-op) sehingga modul lain tetap jalan tanpa kunci.
import webpush from "web-push";
import { env } from "../lib/env.ts";

export type PushTarget = { endpoint: string; p256dh: string; auth: string };

export type PushPayload = {
  title: string;
  body: string;
  url?: string; // tujuan saat notifikasi diklik (SW notificationclick)
  tag?: string; // collapse: notifikasi dengan tag sama saling menimpa
};

export const pushEnabled = env.vapid !== null;

if (env.vapid) {
  webpush.setVapidDetails(
    env.vapid.subject,
    env.vapid.publicKey,
    env.vapid.privateKey,
  );
}

export type SendResult =
  | { ok: true }
  | { ok: false; gone: boolean }; // gone = 404/410 → subscription basi, hapus.

// Kirim ke satu subscription. Tidak melempar: kegagalan push tak boleh
// menggagalkan alur operator/booking. `gone` menandai endpoint sudah mati.
export async function sendPush(
  target: PushTarget,
  payload: PushPayload,
): Promise<SendResult> {
  if (!env.vapid) return { ok: false, gone: false };
  try {
    await webpush.sendNotification(
      {
        endpoint: target.endpoint,
        keys: { p256dh: target.p256dh, auth: target.auth },
      },
      JSON.stringify(payload),
    );
    return { ok: true };
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode;
    const gone = status === 404 || status === 410;
    if (!gone) console.error("Push gagal:", status ?? err);
    return { ok: false, gone };
  }
}
