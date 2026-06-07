"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { login } from "@/lib/auth";
import { ApiClientError } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const mutation = useMutation({
    mutationFn: () => login(email, password),
    onSuccess: () => router.push("/dashboard"),
  });

  const errorMessage =
    mutation.error instanceof ApiClientError
      ? mutation.error.message
      : mutation.error
        ? "Gagal masuk. Coba lagi."
        : null;

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-lg font-bold text-white">
            Q
          </div>
          <h1 className="text-xl font-semibold">Masuk CMS</h1>
          <p className="text-sm text-slate-500">Queue Management System</p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
          className="space-y-4"
        >
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 outline-none focus:border-brand"
              placeholder="admin@demo.test"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 outline-none focus:border-brand"
              placeholder="••••••••"
            />
          </div>

          {errorMessage && (
            <p className="rounded-2xl bg-red-50 px-4 py-2 text-sm text-red-600">
              {errorMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={mutation.isPending}
            className="w-full rounded-full bg-brand px-4 py-2.5 font-medium text-white transition hover:bg-brand-dark disabled:opacity-60"
          >
            {mutation.isPending ? "Memproses…" : "Masuk"}
          </button>
        </form>
      </div>
    </main>
  );
}
