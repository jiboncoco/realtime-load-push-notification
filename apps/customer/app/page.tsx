"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// MVP: customer biasanya tiba dari QR ke /o/{outletId}. Halaman ini hanya
// fallback untuk memasukkan Outlet ID manual saat demo.
export default function Home() {
  const router = useRouter();
  const [outletId, setOutletId] = useState("");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6 rounded-3xl bg-white p-8 text-center shadow-sm">
        <div>
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-lg font-bold text-white">
            Q
          </div>
          <h1 className="text-xl font-semibold">Ambil Antrian</h1>
          <p className="text-sm text-slate-500">
            Scan QR di outlet, atau masukkan Outlet ID.
          </p>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (outletId.trim()) router.push(`/o/${outletId.trim()}`);
          }}
          className="space-y-3"
        >
          <input
            value={outletId}
            onChange={(e) => setOutletId(e.target.value)}
            placeholder="Outlet ID"
            className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 outline-none focus:border-brand"
          />
          <button
            type="submit"
            className="w-full rounded-full bg-brand px-4 py-2.5 font-medium text-white hover:bg-brand-dark"
          >
            Lanjut
          </button>
        </form>
      </div>
    </main>
  );
}
