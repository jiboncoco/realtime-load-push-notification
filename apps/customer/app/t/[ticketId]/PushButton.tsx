"use client";

import { useEffect, useState } from "react";
import { enablePush, currentPushState, type PushState } from "@/lib/push";

// Tombol "Aktifkan notifikasi". Sembunyi bila browser tak mendukung / VAPID kosong.
// Catatan iOS: push hanya jalan bila PWA di-install ke Home Screen (Bagikan →
// "Tambahkan ke Layar Utama"); in-app banner via WebSocket tetap jalur utama.
export function PushButton({ ticketId }: { ticketId: string }) {
  const [state, setState] = useState<PushState>("default");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    currentPushState().then(setState);
  }, []);

  if (state === "unsupported" || state === "granted") {
    return state === "granted" ? (
      <p className="text-sm text-slate-400">🔔 Notifikasi aktif</p>
    ) : null;
  }

  async function onClick() {
    setBusy(true);
    try {
      setState(await enablePush(ticketId));
    } catch {
      // Gagal teknis (mis. backend) — biarkan user coba lagi.
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={onClick}
        disabled={busy}
        className="w-full rounded-full bg-brand px-6 py-3 font-medium text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
      >
        {busy ? "Mengaktifkan…" : "🔔 Aktifkan notifikasi"}
      </button>
      {state === "denied" && (
        <p className="text-xs text-slate-400">
          Izin notifikasi ditolak. Aktifkan dari setelan browser bila ingin diberi tahu.
        </p>
      )}
    </div>
  );
}
