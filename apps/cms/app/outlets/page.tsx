"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { RequireAuth } from "@/components/RequireAuth";
import { outletsApi } from "@/lib/outlets";
import { openReasonLabel } from "@/lib/outletStatus";

export default function OutletsPage() {
  return (
    <RequireAuth>
      <OutletsList />
    </RequireAuth>
  );
}

function OutletsList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["outlets"],
    queryFn: outletsApi.list,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Outlet</h1>
        <Link
          href="/outlets/new"
          className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
        >
          + Buat Outlet
        </Link>
      </div>

      {isLoading && <p className="text-slate-400">Memuat…</p>}
      {error && <p className="text-red-600">Gagal memuat outlet.</p>}

      {data && data.length === 0 && (
        <div className="rounded-3xl bg-white p-8 text-center text-slate-400 shadow-sm">
          Belum ada outlet. Buat yang pertama.
        </div>
      )}

      <ul className="space-y-3">
        {data?.map((o) => (
          <li key={o.id}>
            <Link
              href={`/outlets/${o.id}`}
              className="block rounded-2xl bg-white p-5 shadow-sm transition hover:shadow"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="font-medium">{o.name}</div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    o.open
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {o.open ? "Buka" : "Tutup"} · {openReasonLabel(o.open_reason)}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs font-semibold text-slate-700">
                  {o.code_display}
                </span>
                {o.address && <span>{o.address}</span>}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
