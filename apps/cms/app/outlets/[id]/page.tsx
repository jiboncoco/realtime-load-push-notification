"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { RequireAuth } from "@/components/RequireAuth";
import { outletsApi, type OutletWithPlatforms } from "@/lib/outlets";
import { ApiClientError } from "@/lib/api";

export default function OutletDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <RequireAuth>
      <OutletDetail id={id} />
    </RequireAuth>
  );
}

function OutletDetail({ id }: { id: string }) {
  const router = useRouter();
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["outlet", id] });
    qc.invalidateQueries({ queryKey: ["outlets"] });
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ["outlet", id],
    queryFn: () => outletsApi.get(id),
  });

  if (isLoading) return <p className="text-slate-400">Memuat…</p>;
  if (error || !data)
    return <p className="text-red-600">Outlet tidak ditemukan.</p>;

  return (
    <div className="space-y-6">
      <OutletHeader
        outlet={data}
        onSaved={invalidate}
        onDeleted={() => {
          qc.invalidateQueries({ queryKey: ["outlets"] });
          router.push("/outlets");
        }}
      />
      <PlatformsCard outlet={data} onChanged={invalidate} />
    </div>
  );
}

function OutletHeader({
  outlet,
  onSaved,
  onDeleted,
}: {
  outlet: OutletWithPlatforms;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const [name, setName] = useState(outlet.name);
  const [address, setAddress] = useState(outlet.address ?? "");
  useEffect(() => {
    setName(outlet.name);
    setAddress(outlet.address ?? "");
  }, [outlet.id, outlet.name, outlet.address]);

  const save = useMutation({
    mutationFn: () =>
      outletsApi.update(outlet.id, { name, address: address || null }),
    onSuccess: onSaved,
  });

  const remove = useMutation({
    mutationFn: () => outletsApi.remove(outlet.id),
    onSuccess: onDeleted,
  });

  return (
    <div className="space-y-4 rounded-3xl bg-white p-6 shadow-sm">
      <label className="block">
        <span className="mb-1 block text-sm font-medium">Nama outlet</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium">Alamat</span>
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="input"
        />
      </label>
      <div className="flex justify-between">
        <button
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="rounded-full bg-brand px-5 py-2 font-medium text-white hover:bg-brand-dark disabled:opacity-60"
        >
          {save.isPending ? "Menyimpan…" : "Simpan perubahan"}
        </button>
        <button
          onClick={() => {
            if (confirm("Hapus outlet ini beserta platform-nya?"))
              remove.mutate();
          }}
          className="rounded-full border border-red-200 px-5 py-2 font-medium text-red-600 hover:bg-red-50"
        >
          Hapus outlet
        </button>
      </div>
    </div>
  );
}

function PlatformsCard({
  outlet,
  onChanged,
}: {
  outlet: OutletWithPlatforms;
  onChanged: () => void;
}) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");

  const add = useMutation({
    mutationFn: () => outletsApi.addPlatform(outlet.id, { code, name }),
    onSuccess: () => {
      setCode("");
      setName("");
      onChanged();
    },
  });

  const remove = useMutation({
    mutationFn: (platformId: string) => outletsApi.removePlatform(platformId),
    onSuccess: onChanged,
  });

  const addError =
    add.error instanceof ApiClientError ? add.error.message : null;
  const removeError =
    remove.error instanceof ApiClientError ? remove.error.message : null;

  return (
    <div className="space-y-4 rounded-3xl bg-white p-6 shadow-sm">
      <h2 className="font-medium">Platform ({outlet.platforms.length})</h2>

      <ul className="space-y-2">
        {outlet.platforms.map((p) => (
          <li
            key={p.id}
            className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-2.5"
          >
            <span>
              <span className="inline-block w-10 font-semibold text-brand">
                {p.code}
              </span>
              {p.name}
            </span>
            <button
              onClick={() => remove.mutate(p.id)}
              className="text-sm text-slate-400 hover:text-red-600"
            >
              Hapus
            </button>
          </li>
        ))}
      </ul>

      {removeError && <p className="text-sm text-red-600">{removeError}</p>}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          add.mutate();
        }}
        className="flex gap-2 border-t pt-4"
      >
        <input
          required
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="input w-20 uppercase"
          placeholder="C"
        />
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input flex-1"
          placeholder="Nama platform"
        />
        <button
          type="submit"
          disabled={add.isPending}
          className="rounded-full bg-brand px-4 font-medium text-white hover:bg-brand-dark disabled:opacity-60"
        >
          Tambah
        </button>
      </form>
      {addError && <p className="text-sm text-red-600">{addError}</p>}
    </div>
  );
}
