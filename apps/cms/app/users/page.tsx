"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { RequireAuth } from "@/components/RequireAuth";
import { usersApi } from "@/lib/users";

export default function UsersPage() {
  return (
    <RequireAuth>
      <UsersList />
    </RequireAuth>
  );
}

function UsersList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["users"],
    queryFn: usersApi.list,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">User & Operator</h1>
        <Link
          href="/users/new"
          className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
        >
          + Buat User
        </Link>
      </div>

      {isLoading && <p className="text-slate-400">Memuat…</p>}
      {error && <p className="text-red-600">Gagal memuat user.</p>}

      <ul className="space-y-3">
        {data?.map((u) => (
          <li key={u.id}>
            <Link
              href={`/users/${u.id}`}
              className="flex items-center justify-between rounded-2xl bg-white p-5 shadow-sm transition hover:shadow"
            >
              <div>
                <div className="font-medium">
                  {u.name}
                  {!u.is_active && (
                    <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                      nonaktif
                    </span>
                  )}
                </div>
                <div className="text-sm text-slate-500">{u.email}</div>
              </div>
              <div className="text-right">
                <RoleBadge role={u.role} />
                {u.role === "operator" && (
                  <div className="mt-1 text-xs text-slate-400">
                    {u.outlet_ids.length} outlet
                  </div>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RoleBadge({ role }: { role: "admin" | "operator" }) {
  const cls =
    role === "admin"
      ? "bg-brand/10 text-brand"
      : "bg-amber-100 text-amber-700";
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {role}
    </span>
  );
}
