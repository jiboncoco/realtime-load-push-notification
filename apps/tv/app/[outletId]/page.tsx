"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { getDisplay, type DisplayPlatform } from "@/lib/api";
import { useRealtime } from "@/lib/useRealtime";

// Layar TV per outlet: read-only, tipografi besar, kontras tinggi.
// Update via WebSocket (subscribe outlet:{id}) + polling 15s sebagai fallback.
export default function TvPage({
  params,
}: {
  params: Promise<{ outletId: string }>;
}) {
  const { outletId } = use(params);

  const { data, isLoading, error } = useQuery({
    queryKey: ["display", outletId],
    queryFn: () => getDisplay(outletId),
    refetchInterval: 15000,
  });

  useRealtime(`outlet:${outletId}`, ["display", outletId]);

  if (isLoading)
    return <Center>Memuat…</Center>;
  if (error || !data)
    return <Center>Outlet tidak ditemukan.</Center>;

  return (
    <main className="min-h-screen p-8">
      <header className="mb-8 flex items-baseline justify-between border-b border-slate-700 pb-4">
        <h1 className="text-4xl font-bold">{data.outlet.name}</h1>
        <span className="text-xl text-slate-400">Antrian</span>
      </header>

      <div className="grid auto-rows-fr gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {data.platforms.map((p) => (
          <PlatformCard key={p.id} p={p} />
        ))}
      </div>
    </main>
  );
}

function PlatformCard({ p }: { p: DisplayPlatform }) {
  const active = !!p.current;
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-3xl p-8 text-center ${
        active ? "bg-brand" : "bg-slate-800"
      }`}
    >
      <div className="text-2xl font-semibold text-slate-200">
        {p.code} · {p.name}
      </div>
      <div className="my-4 text-7xl font-black tracking-tight">
        {p.current ? p.current.label : "—"}
      </div>
      <div className="text-lg text-slate-300">
        {p.current
          ? p.current.status === "CALLED"
            ? "Silakan menuju loket"
            : "Sedang dilayani"
          : "Menunggu panggilan"}
      </div>
      <div className="mt-2 text-sm text-slate-400">{p.waiting} menunggu</div>
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center p-8 text-2xl text-slate-400">
      {children}
    </main>
  );
}
