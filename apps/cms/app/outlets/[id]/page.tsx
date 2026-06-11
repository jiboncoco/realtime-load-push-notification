"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { RequireAuth } from "@/components/RequireAuth";
import {
  outletsApi,
  type DayHours,
  type OutletWithPlatforms,
} from "@/lib/outlets";
import { ApiClientError } from "@/lib/api";
import { DAY_NAMES, hhmm, openReasonLabel } from "@/lib/outletStatus";
import { QrCard } from "./QrCard";

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
      <StatusCard outlet={data} onChanged={invalidate} />
      <OutletHeader
        outlet={data}
        onSaved={invalidate}
        onDeleted={() => {
          qc.invalidateQueries({ queryKey: ["outlets"] });
          router.push("/outlets");
        }}
      />
      <QrCard outlet={data} />
      <HoursCard outlet={data} onSaved={invalidate} />
      <PlatformsCard outlet={data} onChanged={invalidate} />
    </div>
  );
}

// Kode outlet (untuk diberitahu ke customer) + status buka/tutup + toggle manual.
function StatusCard({
  outlet,
  onChanged,
}: {
  outlet: OutletWithPlatforms;
  onChanged: () => void;
}) {
  const toggle = useMutation({
    mutationFn: (accepting: boolean) =>
      outletsApi.update(outlet.id, { accepting }),
    onSuccess: onChanged,
  });

  return (
    <div className="space-y-4 rounded-3xl bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="block text-sm text-slate-500">Kode outlet</span>
          <span className="font-mono text-2xl font-bold tracking-wider text-brand">
            {outlet.code_display}
          </span>
          <p className="mt-0.5 text-xs text-slate-400">
            Bacakan kode ini ke customer untuk cari outlet.
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-sm font-medium ${
            outlet.open
              ? "bg-emerald-100 text-emerald-700"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          {outlet.open ? "Buka" : "Tutup"} · {openReasonLabel(outlet.open_reason)}
        </span>
      </div>

      <label className="flex items-center justify-between border-t pt-4">
        <span>
          <span className="block font-medium">Terima antrian</span>
          <span className="text-sm text-slate-500">
            Matikan untuk menutup sementara (mis. istirahat). Jam operasional
            tetap berlaku saat dinyalakan.
          </span>
        </span>
        <input
          type="checkbox"
          checked={outlet.accepting}
          disabled={toggle.isPending}
          onChange={(e) => toggle.mutate(e.target.checked)}
          className="h-6 w-6 accent-brand"
        />
      </label>
    </div>
  );
}

// Editor jam operasional per hari (Min..Sab). Replace-all saat disimpan.
function HoursCard({
  outlet,
  onSaved,
}: {
  outlet: OutletWithPlatforms;
  onSaved: () => void;
}) {
  // State 7 hari; isi dari outlet.hours, default jam 08:00–17:00 bila kosong.
  const initial = (): DayHours[] =>
    DAY_NAMES.map((_, weekday) => {
      const existing = outlet.hours.find((h) => h.weekday === weekday);
      return existing
        ? {
            weekday,
            is_closed: existing.is_closed,
            open_time: hhmm(existing.open_time) || "08:00",
            close_time: hhmm(existing.close_time) || "17:00",
          }
        : { weekday, is_closed: false, open_time: "08:00", close_time: "17:00" };
    });

  // hasUnset: ada hari yang sama sekali tak diatur (jadwal kosong = 24 jam).
  const [rows, setRows] = useState<DayHours[]>(initial);
  const [useSchedule, setUseSchedule] = useState(outlet.hours.length > 0);
  useEffect(() => {
    setRows(initial());
    setUseSchedule(outlet.hours.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outlet.id, outlet.hours]);

  const setRow = (i: number, patch: Partial<DayHours>) =>
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const save = useMutation({
    // useSchedule=false → kirim [] (buka 24 jam selama 'Terima antrian').
    mutationFn: () => outletsApi.setHours(outlet.id, useSchedule ? rows : []),
    onSuccess: onSaved,
  });

  const error = save.error instanceof ApiClientError ? save.error.message : null;

  return (
    <div className="space-y-4 rounded-3xl bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">Jam operasional</h2>
        <label className="flex items-center gap-2 text-sm text-slate-500">
          <input
            type="checkbox"
            checked={useSchedule}
            onChange={(e) => setUseSchedule(e.target.checked)}
            className="h-4 w-4 accent-brand"
          />
          Pakai jadwal jam
        </label>
      </div>

      {!useSchedule ? (
        <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
          Tanpa jadwal: outlet buka kapan saja selama “Terima antrian” aktif.
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map((r, i) => (
            <div key={r.weekday} className="flex items-center gap-3">
              <span className="w-10 text-sm font-medium">
                {DAY_NAMES[r.weekday]}
              </span>
              <label className="flex items-center gap-1.5 text-sm text-slate-500">
                <input
                  type="checkbox"
                  checked={r.is_closed}
                  onChange={(e) => setRow(i, { is_closed: e.target.checked })}
                  className="h-4 w-4 accent-brand"
                />
                Libur
              </label>
              <input
                type="time"
                disabled={r.is_closed}
                value={r.open_time ?? ""}
                onChange={(e) => setRow(i, { open_time: e.target.value })}
                className="input w-28 disabled:opacity-40"
              />
              <span className="text-slate-400">–</span>
              <input
                type="time"
                disabled={r.is_closed}
                value={r.close_time ?? ""}
                onChange={(e) => setRow(i, { close_time: e.target.value })}
                className="input w-28 disabled:opacity-40"
              />
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        onClick={() => save.mutate()}
        disabled={save.isPending}
        className="rounded-full bg-brand px-5 py-2 font-medium text-white hover:bg-brand-dark disabled:opacity-60"
      >
        {save.isPending ? "Menyimpan…" : "Simpan jam"}
      </button>
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
