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
    <main className="min-h-screen p-4 sm:p-6 lg:p-8">
      <header className="mb-5 flex items-baseline justify-between gap-3 border-b border-slate-700 pb-3 sm:mb-8 sm:pb-4">
        <h1 className="truncate text-2xl font-bold sm:text-3xl lg:text-4xl">
          {data.outlet.name}
        </h1>
        <span className="shrink-0 text-base text-slate-400 sm:text-xl">
          Antrian
        </span>
      </header>

      <div className="grid auto-rows-fr gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-6">
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
      className={`flex flex-col items-center justify-center rounded-2xl p-5 text-center sm:rounded-3xl sm:p-8 ${
        active ? "bg-brand" : "bg-slate-800"
      }`}
    >
      <div className="text-lg font-semibold text-slate-200 sm:text-2xl">
        {p.code} · {p.name}
      </div>
      <div className="my-2 text-5xl font-black tracking-tight sm:my-4 sm:text-7xl lg:text-8xl">
        {p.current ? p.current.label : "—"}
      </div>
      <div className="text-base text-slate-300 sm:text-lg">
        {p.current
          ? p.current.status === "CALLED"
            ? "Silakan menuju loket"
            : "Sedang dilayani"
          : "Menunggu panggilan"}
      </div>
      <div className="mt-1 text-sm text-slate-400 sm:mt-2">
        {p.waiting} menunggu
      </div>
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
