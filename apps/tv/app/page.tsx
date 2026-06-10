"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Layar setup: masukkan Outlet ID untuk menampilkan TV outlet tsb.
export default function Home() {
  const router = useRouter();
  const [outletId, setOutletId] = useState("");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-md space-y-6 text-center">
        <h1 className="text-3xl font-bold">Layar Antrian (TV)</h1>
        <p className="text-slate-400">Masukkan Outlet ID untuk menampilkan layar.</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (outletId.trim()) router.push(`/${outletId.trim()}`);
          }}
          className="space-y-3"
        >
          <input
            value={outletId}
            onChange={(e) => setOutletId(e.target.value)}
            placeholder="Outlet ID"
            className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-center outline-none focus:border-brand"
          />
          <button
            type="submit"
            className="w-full rounded-xl bg-brand px-4 py-3 text-lg font-semibold hover:bg-brand-dark"
          >
            Tampilkan
          </button>
        </form>
      </div>
    </main>
  );
}
