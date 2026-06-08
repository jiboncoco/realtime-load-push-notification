"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { RequireAuth } from "@/components/RequireAuth";
import { queueApi } from "@/lib/queue";

// Pilih outlet untuk dipantau. Admin: semua outlet client; operator: assigned.
export default function QueueOutletsPage() {
  return (
    <RequireAuth>
      <OutletChooser />
    </RequireAuth>
  );
}

function OutletChooser() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["me-outlets"],
    queryFn: queueApi.myOutlets,
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Antrian</h1>
      {isLoading && <p className="text-slate-400">Memuat…</p>}
      {error && <p className="text-red-600">Gagal memuat outlet.</p>}
      {data && data.length === 0 && (
        <div className="rounded-3xl bg-white p-8 text-center text-slate-400 shadow-sm">
          Belum ada outlet yang bisa kamu kelola.
        </div>
      )}
      <ul className="space-y-3">
        {data?.map((o) => (
          <li key={o.id}>
            <Link
              href={`/queue/${o.id}`}
              className="block rounded-2xl bg-white p-5 shadow-sm transition hover:shadow"
            >
              <span className="font-medium">{o.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
