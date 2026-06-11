"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { outletsApi, todayHoursLabel, type PublicOutlet } from "@/lib/outlets";
import { ApiClientError } from "@/lib/api";

// Home: daftar outlet + status buka/tutup. Customer pilih outlet yang BUKA untuk
// ambil antrian. Fallback: masukkan kode outlet (dari operator) bila tak terlihat.
export default function Home() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["outlets-public"],
    queryFn: outletsApi.list,
    refetchInterval: 30000, // status buka/tutup bisa berubah
  });

  return (
    <main className="mx-auto min-h-screen w-full max-w-md space-y-5 p-5">
      <header className="pt-4 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-lg font-bold text-white">
          Q
        </div>
        <h1 className="text-xl font-semibold">Pilih Outlet</h1>
        <p className="text-sm text-slate-500">
          Pilih outlet yang buka untuk ambil nomor antrian.
        </p>
      </header>

      {isLoading && <p className="text-center text-slate-400">Memuat…</p>}
      {error && (
        <p className="text-center text-red-600">Gagal memuat daftar outlet.</p>
      )}
      {data && data.length === 0 && (
        <p className="rounded-3xl bg-white p-8 text-center text-slate-400 shadow-sm">
          Belum ada outlet.
        </p>
      )}

      <ul className="space-y-3">
        {data?.map((o) => (
          <OutletCard key={o.id} outlet={o} />
        ))}
      </ul>

      <CodeFallback />
    </main>
  );
}

function OutletCard({ outlet: o }: { outlet: PublicOutlet }) {
  const router = useRouter();
  const card = (
    <div
      className={`rounded-2xl border bg-white p-5 shadow-sm ${
        o.open ? "border-transparent" : "border-slate-100 opacity-70"
      }`}
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
          {o.open ? "Buka" : "Tutup"}
        </span>
      </div>
      <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
        <span className="font-mono text-xs font-semibold text-slate-600">
          {o.code_display}
        </span>
        <span>· {todayHoursLabel(o)}</span>
      </div>
    </div>
  );

  if (!o.open) return <li>{card}</li>;
  return (
    <li>
      <button
        onClick={() => router.push(`/o/${o.id}`)}
        className="block w-full text-left transition hover:opacity-90"
      >
        {card}
      </button>
    </li>
  );
}

// Fallback: customer menerima kode dari operator → cari & menuju outlet.
function CodeFallback() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      const o = await outletsApi.byCode(code.trim());
      router.push(`/o/${o.id}`);
    } catch (e) {
      setErr(
        e instanceof ApiClientError && e.status === 404
          ? "Kode outlet tidak ditemukan."
          : "Gagal mencari outlet.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-2 pt-2">
      <label className="block text-sm text-slate-500">
        Punya kode outlet? Masukkan di sini:
      </label>
      <div className="flex gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="mis. K7Q-9PT"
          className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 uppercase outline-none focus:border-brand"
        />
        <button
          type="submit"
          disabled={busy}
          className="shrink-0 rounded-full bg-brand px-5 py-2.5 font-medium text-white hover:bg-brand-dark disabled:opacity-60"
        >
          Cari
        </button>
      </div>
      {err && <p className="text-sm text-red-600">{err}</p>}
    </form>
  );
}
