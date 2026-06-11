"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ticketApi } from "@/lib/ticket";
import { outletsApi, todayHoursLabel } from "@/lib/outlets";
import { useRealtime } from "@/lib/useRealtime";
import { ApiClientError } from "@/lib/api";

// Layar fokus: nama outlet + status + satu tombol besar ambil antrian (§3).
// Tombol nonaktif bila outlet tutup; booking ke server tetap di-guard (OUTLET_CLOSED).
export default function BookPage({
  params,
}: {
  params: Promise<{ outletId: string }>;
}) {
  const { outletId } = use(params);
  const router = useRouter();

  const { data: outlet, isLoading } = useQuery({
    queryKey: ["outlet-info", outletId],
    queryFn: () => outletsApi.info(outletId),
    refetchInterval: 20000,
  });
  // Status buka/tutup berubah saat operator toggle → ikut update via WS.
  useRealtime(`outlet:${outletId}`, ["outlet-info", outletId]);

  const book = useMutation({
    mutationFn: () => ticketApi.book(outletId),
    onSuccess: (ticket) => router.push(`/t/${ticket.id}`),
  });

  const errorMessage =
    book.error instanceof ApiClientError
      ? book.error.message
      : book.error
        ? "Gagal mengambil antrian."
        : null;

  const closed = outlet ? !outlet.open : false;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8 text-center">
        <div>
          <h1 className="text-2xl font-semibold">
            {outlet?.name ?? "Ambil Antrian"}
          </h1>
          {outlet && (
            <p className="mt-1 text-sm text-slate-500">
              <span
                className={`mr-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                  outlet.open
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {outlet.open ? "Buka" : "Tutup"}
              </span>
              {todayHoursLabel(outlet)}
            </p>
          )}
        </div>

        <button
          onClick={() => book.mutate()}
          disabled={book.isPending || closed || isLoading}
          className="aspect-square w-full max-w-xs rounded-3xl bg-brand text-2xl font-bold text-white shadow-sm transition hover:bg-brand-dark disabled:opacity-50"
        >
          {closed
            ? "Tutup"
            : book.isPending
              ? "Memproses…"
              : "Ambil Nomor"}
        </button>

        {closed && (
          <p className="rounded-2xl bg-slate-50 px-4 py-2 text-sm text-slate-500">
            Outlet sedang tutup. Silakan kembali pada jam operasional.
          </p>
        )}

        {errorMessage && (
          <p className="rounded-2xl bg-red-50 px-4 py-2 text-sm text-red-600">
            {errorMessage}
          </p>
        )}
      </div>
    </main>
  );
}
