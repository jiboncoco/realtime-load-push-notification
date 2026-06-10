"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { ticketApi, type TicketStatus } from "@/lib/ticket";
import { useRealtime } from "@/lib/useRealtime";
import { PushButton } from "./PushButton";

const STATUS_LABEL: Record<TicketStatus, string> = {
  WAITING: "Menunggu",
  CALLED: "Dipanggil",
  SERVING: "Dilayani",
  COMPLETED: "Selesai",
  SKIPPED: "Dilewati",
};

// Layar status: nomor besar + sisa di depan. Polling tiap 5 dtk
// (realtime WebSocket menyusul di modul Monitor+TV).
export default function StatusPage({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}) {
  const { ticketId } = use(params);

  const { data, isLoading, error } = useQuery({
    queryKey: ["ticket", ticketId],
    queryFn: () => ticketApi.status(ticketId),
    refetchInterval: 15000, // fallback; update utama via WebSocket
  });

  // Subscribe ke outlet (bukan hanya tiket) agar "sisa di depan" ikut update
  // saat antrian lain dipanggil/diselesaikan.
  useRealtime(data ? `outlet:${data.outlet_id}` : null, ["ticket", ticketId]);

  if (isLoading)
    return <Centered>Memuat…</Centered>;
  if (error || !data)
    return <Centered>Tiket tidak ditemukan.</Centered>;

  const called = data.status === "CALLED" || data.status === "SERVING";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6 rounded-3xl bg-white p-8 text-center shadow-sm">
        <div>
          <p className="text-sm text-slate-500">{data.platform.name}</p>
          <div
            className={`my-2 text-6xl font-bold tracking-tight ${
              called ? "text-accent" : "text-brand"
            }`}
          >
            {data.label}
          </div>
          <span className="inline-block rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600">
            {STATUS_LABEL[data.status]}
          </span>
        </div>

        {data.status === "WAITING" && (
          <div className="rounded-2xl bg-brand/5 p-4">
            <div className="text-3xl font-semibold text-brand">{data.ahead}</div>
            <div className="text-sm text-slate-500">antrian di depan Anda</div>
          </div>
        )}

        {called && (
          <p className="rounded-2xl bg-accent/10 px-4 py-3 font-medium text-accent">
            Giliran Anda — menuju {data.platform.name}.
          </p>
        )}

        {(data.status === "WAITING" || data.status === "CALLED") && (
          <PushButton ticketId={ticketId} />
        )}
      </div>
    </main>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center p-6 text-slate-400">
      {children}
    </main>
  );
}
