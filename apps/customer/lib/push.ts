// Web Push client: registrasi Service Worker + subscribe ke PushManager,
// lalu kirim subscription ke backend untuk dikaitkan ke tiket.
import { api } from "./api";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

export type PushState =
  | "unsupported" // browser tak mendukung Push/SW, atau VAPID kosong
  | "default" // belum diputuskan
  | "granted" // sudah subscribe
  | "denied"; // izin ditolak user

// VAPID public key (base64url) → Uint8Array untuk applicationServerKey.
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window &&
    VAPID_PUBLIC_KEY.length > 0
  );
}

export async function currentPushState(): Promise<PushState> {
  if (!pushSupported()) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (Notification.permission === "granted" && sub) return "granted";
  return "default";
}

// Minta izin → subscribe → daftarkan ke backend untuk tiket ini.
// Mengembalikan state akhir; lempar bila gagal teknis (bukan sekadar ditolak).
export async function enablePush(ticketId: string): Promise<PushState> {
  if (!pushSupported()) return "unsupported";

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission === "denied" ? "denied" : "default";

  const reg =
    (await navigator.serviceWorker.getRegistration()) ??
    (await navigator.serviceWorker.register("/sw.js"));
  await navigator.serviceWorker.ready;

  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    }));

  // toJSON() → { endpoint, keys: { p256dh, auth }, expirationTime }
  await api.post(`/tickets/${ticketId}/push-subscribe`, sub.toJSON());
  return "granted";
}
