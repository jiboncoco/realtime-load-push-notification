"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUser, logout, type SessionUser } from "@/lib/auth";

// Placeholder dashboard — modul berikutnya (Outlet/Platform, Monitor) menyusul.
export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    const u = getUser();
    if (!u) {
      router.replace("/login");
      return;
    }
    setUser(u);
  }, [router]);

  if (!user) return null;

  return (
    <main className="mx-auto max-w-2xl p-6">
      <div className="rounded-3xl bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold">Halo, {user.name} 👋</h1>
        <p className="mt-1 text-slate-500">
          Role: <span className="font-medium text-brand">{user.role}</span>
        </p>
        <p className="mt-4 text-sm text-slate-400">
          Dashboard placeholder. Modul Outlet/Platform & Monitor menyusul.
        </p>
        <button
          onClick={() => {
            logout();
            router.push("/login");
          }}
          className="mt-6 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-50"
        >
          Keluar
        </button>
      </div>
    </main>
  );
}
