"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getToken, getUser, logout } from "@/lib/auth";

// Guard klien sederhana (MVP): redirect ke /login bila tak ada token.
// Membungkus halaman CMS terproteksi + memberi top bar konsisten.
export function RequireAuth({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    setReady(true);
  }, [router]);

  if (!ready) return null;

  const user = getUser();

  return (
    <div className="min-h-screen">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <Link href="/outlets" className="font-semibold text-brand">
              QMS · CMS
            </Link>
            <nav className="flex gap-3 text-sm text-slate-600">
              <Link href="/outlets" className="hover:text-brand">
                Outlet
              </Link>
              <Link href="/users" className="hover:text-brand">
                User
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <span>{user?.name}</span>
            <button
              onClick={() => {
                logout();
                router.push("/login");
              }}
              className="rounded-full border border-slate-200 px-3 py-1 hover:bg-slate-50"
            >
              Keluar
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6">{children}</main>
    </div>
  );
}
