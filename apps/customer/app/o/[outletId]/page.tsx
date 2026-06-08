"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { ticketApi } from "@/lib/ticket";
import { ApiClientError } from "@/lib/api";

// Layar fokus: satu tombol besar untuk ambil antrian (CLAUDE.md §3).
export default function BookPage({
  params,
}: {
  params: Promise<{ outletId: string }>;
}) {
  const { outletId } = use(params);
  const router = useRouter();

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

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8 text-center">
        <div>
          <h1 className="text-2xl font-semibold">Ambil Antrian</h1>
          <p className="mt-1 text-slate-500">
            Tekan tombol di bawah untuk mendapat nomor.
          </p>
        </div>

        <button
          onClick={() => book.mutate()}
          disabled={book.isPending}
          className="aspect-square w-full max-w-xs rounded-3xl bg-brand text-2xl font-bold text-white shadow-sm transition hover:bg-brand-dark disabled:opacity-60"
        >
          {book.isPending ? "Memproses…" : "Ambil Nomor"}
        </button>

        {errorMessage && (
          <p className="rounded-2xl bg-red-50 px-4 py-2 text-sm text-red-600">
            {errorMessage}
          </p>
        )}
      </div>
    </main>
  );
}
