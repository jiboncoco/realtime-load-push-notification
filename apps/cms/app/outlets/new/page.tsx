"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { RequireAuth } from "@/components/RequireAuth";
import { outletsApi, type NewPlatform } from "@/lib/outlets";
import { ApiClientError } from "@/lib/api";

export default function NewOutletPage() {
  return (
    <RequireAuth>
      <NewOutletForm />
    </RequireAuth>
  );
}

function NewOutletForm() {
  const router = useRouter();
  const qc = useQueryClient();

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  // Outlet wajib >=1 platform → mulai dengan satu baris.
  const [platforms, setPlatforms] = useState<NewPlatform[]>([
    { code: "A", name: "" },
  ]);

  const mutation = useMutation({
    mutationFn: () =>
      outletsApi.create({
        name,
        address: address || undefined,
        platforms,
      }),
    onSuccess: (outlet) => {
      qc.invalidateQueries({ queryKey: ["outlets"] });
      router.push(`/outlets/${outlet.id}`);
    },
  });

  const setPlatform = (i: number, patch: Partial<NewPlatform>) =>
    setPlatforms((rows) =>
      rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)),
    );

  const errorMessage =
    mutation.error instanceof ApiClientError
      ? mutation.error.message
      : mutation.error
        ? "Gagal membuat outlet."
        : null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Buat Outlet</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
        className="space-y-6"
      >
        <div className="space-y-4 rounded-3xl bg-white p-6 shadow-sm">
          <Field label="Nama outlet">
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              placeholder="Outlet Pusat"
            />
          </Field>
          <Field label="Alamat (opsional)">
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="input"
              placeholder="Jl. Mawar No. 1"
            />
          </Field>
        </div>

        <div className="space-y-3 rounded-3xl bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">Platform</h2>
            <button
              type="button"
              onClick={() =>
                setPlatforms((r) => [...r, { code: "", name: "" }])
              }
              className="text-sm font-medium text-brand"
            >
              + Tambah
            </button>
          </div>
          <p className="text-xs text-slate-400">
            Outlet wajib punya minimal 1 platform.
          </p>

          {platforms.map((p, i) => (
            <div key={i} className="flex gap-2">
              <input
                required
                value={p.code}
                onChange={(e) => setPlatform(i, { code: e.target.value })}
                className="input w-20 uppercase"
                placeholder="A"
              />
              <input
                required
                value={p.name}
                onChange={(e) => setPlatform(i, { name: e.target.value })}
                className="input flex-1"
                placeholder="Kasir A"
              />
              {platforms.length > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    setPlatforms((r) => r.filter((_, idx) => idx !== i))
                  }
                  className="rounded-2xl px-3 text-slate-400 hover:text-red-600"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>

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
            onClick={() => router.push("/outlets")}
            className="rounded-full border border-slate-200 px-5 py-2.5 font-medium hover:bg-slate-50"
          >
            Batal
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}
