"use client";

import { useQuery } from "@tanstack/react-query";
import { outletsApi } from "@/lib/outlets";

// Multi-select outlet (checkbox) untuk assign operator. Outlet diambil dari API,
// jadi hanya outlet milik client yang muncul.
export function OutletPicker({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["outlets"],
    queryFn: outletsApi.list,
  });

  const toggle = (id: string) =>
    onChange(
      selected.includes(id)
        ? selected.filter((x) => x !== id)
        : [...selected, id],
    );

  if (isLoading) return <p className="text-sm text-slate-400">Memuat outlet…</p>;
  if (!data || data.length === 0)
    return (
      <p className="text-sm text-slate-400">
        Belum ada outlet. Buat outlet dulu untuk meng-assign operator.
      </p>
    );

  return (
    <div className="space-y-2">
      {data.map((o) => (
        <label
          key={o.id}
          className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-100 px-4 py-2.5"
        >
          <input
            type="checkbox"
            checked={selected.includes(o.id)}
            onChange={() => toggle(o.id)}
            className="h-4 w-4 accent-brand"
          />
          <span>{o.name}</span>
        </label>
      ))}
    </div>
  );
}
