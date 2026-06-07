"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { RequireAuth } from "@/components/RequireAuth";
import { OutletPicker } from "@/components/OutletPicker";
import { usersApi, type UserRole } from "@/lib/users";
import { ApiClientError } from "@/lib/api";

export default function NewUserPage() {
  return (
    <RequireAuth>
      <NewUserForm />
    </RequireAuth>
  );
}

function NewUserForm() {
  const router = useRouter();
  const qc = useQueryClient();

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("operator");
  const [outletIds, setOutletIds] = useState<string[]>([]);

  const mutation = useMutation({
    mutationFn: () =>
      usersApi.create({
        email,
        name,
        password,
        role,
        outlet_ids: role === "operator" ? outletIds : undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      router.push("/users");
    },
  });

  const errorMessage =
    mutation.error instanceof ApiClientError
      ? mutation.error.message
      : mutation.error
        ? "Gagal membuat user."
        : null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Buat User</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
        className="space-y-6"
      >
        <div className="space-y-4 rounded-3xl bg-white p-6 shadow-sm">
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Nama</span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">
              Password (min 8 karakter)
            </span>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Role</span>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="input"
            >
              <option value="operator">Operator</option>
              <option value="admin">Admin</option>
            </select>
          </label>
        </div>

        {role === "operator" && (
          <div className="space-y-3 rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="font-medium">Outlet yang di-assign</h2>
            <OutletPicker selected={outletIds} onChange={setOutletIds} />
          </div>
        )}

        {errorMessage && (
          <p className="rounded-2xl bg-red-50 px-4 py-2 text-sm text-red-600">
            {errorMessage}
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="rounded-full bg-brand px-5 py-2.5 font-medium text-white hover:bg-brand-dark disabled:opacity-60"
          >
            {mutation.isPending ? "Menyimpan…" : "Simpan"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/users")}
            className="rounded-full border border-slate-200 px-5 py-2.5 font-medium hover:bg-slate-50"
          >
            Batal
          </button>
        </div>
      </form>
    </div>
  );
}
