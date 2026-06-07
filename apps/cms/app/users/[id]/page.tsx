"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RequireAuth } from "@/components/RequireAuth";
import { OutletPicker } from "@/components/OutletPicker";
import { usersApi, type ManagedUser, type UserRole } from "@/lib/users";
import { ApiClientError } from "@/lib/api";

export default function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <RequireAuth>
      <UserDetail id={id} />
    </RequireAuth>
  );
}

function UserDetail({ id }: { id: string }) {
  const router = useRouter();
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["user", id],
    queryFn: () => usersApi.get(id),
  });

  if (isLoading) return <p className="text-slate-400">Memuat…</p>;
  if (error || !data)
    return <p className="text-red-600">User tidak ditemukan.</p>;

  return (
    <EditUser
      user={data}
      onChanged={() => {
        qc.invalidateQueries({ queryKey: ["user", id] });
        qc.invalidateQueries({ queryKey: ["users"] });
      }}
      onDeleted={() => {
        qc.invalidateQueries({ queryKey: ["users"] });
        router.push("/users");
      }}
    />
  );
}

function EditUser({
  user,
  onChanged,
  onDeleted,
}: {
  user: ManagedUser;
  onChanged: () => void;
  onDeleted: () => void;
}) {
  const [name, setName] = useState(user.name);
  const [role, setRole] = useState<UserRole>(user.role);
  const [isActive, setIsActive] = useState(user.is_active);
  const [password, setPassword] = useState("");
  const [outletIds, setOutletIds] = useState<string[]>(user.outlet_ids);

  useEffect(() => {
    setName(user.name);
    setRole(user.role);
    setIsActive(user.is_active);
    setOutletIds(user.outlet_ids);
    setPassword("");
  }, [user]);

  const save = useMutation({
    mutationFn: () =>
      usersApi.update(user.id, {
        name,
        role,
        is_active: isActive,
        ...(password ? { password } : {}),
        outlet_ids: role === "operator" ? outletIds : [],
      }),
    onSuccess: () => {
      setPassword("");
      onChanged();
    },
  });

  const remove = useMutation({
    mutationFn: () => usersApi.remove(user.id),
    onSuccess: onDeleted,
  });

  const err = (m: unknown) =>
    m instanceof ApiClientError ? m.message : m ? "Terjadi kesalahan." : null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{user.email}</h1>

      <div className="space-y-4 rounded-3xl bg-white p-6 shadow-sm">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Nama</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
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
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4 accent-brand"
          />
          <span className="text-sm font-medium">Aktif</span>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">
            Reset password (kosongkan bila tak diubah)
          </span>
          <input
            type="password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
            placeholder="min 8 karakter"
          />
        </label>
      </div>

      {role === "operator" && (
        <div className="space-y-3 rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="font-medium">Outlet yang di-assign</h2>
          <OutletPicker selected={outletIds} onChange={setOutletIds} />
        </div>
      )}

      {err(save.error) && (
        <p className="rounded-2xl bg-red-50 px-4 py-2 text-sm text-red-600">
          {err(save.error)}
        </p>
      )}
      {err(remove.error) && (
        <p className="rounded-2xl bg-red-50 px-4 py-2 text-sm text-red-600">
          {err(remove.error)}
        </p>
      )}

      <div className="flex justify-between">
        <button
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="rounded-full bg-brand px-5 py-2.5 font-medium text-white hover:bg-brand-dark disabled:opacity-60"
        >
          {save.isPending ? "Menyimpan…" : "Simpan perubahan"}
        </button>
        <button
          onClick={() => {
            if (confirm("Hapus user ini?")) remove.mutate();
          }}
          className="rounded-full border border-red-200 px-5 py-2.5 font-medium text-red-600 hover:bg-red-50"
        >
          Hapus user
        </button>
      </div>
    </div>
  );
}
