"use client";

import { use } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RequireAuth } from "@/components/RequireAuth";
import {
  queueApi,
  type QueueItem,
  type QueueSnapshot,
  type TicketAction,
} from "@/lib/queue";
import { ApiClientError } from "@/lib/api";

const SKIP_MIN_CALLS = 3;

export default function QueuePanelPage({
  params,
}: {
  params: Promise<{ outletId: string }>;
}) {
  const { outletId } = use(params);
  return (
    <RequireAuth>
      <Panel outletId={outletId} />
    </RequireAuth>
  );
}

function Panel({ outletId }: { outletId: string }) {
  const qc = useQueryClient();
  const queryKey = ["queue", outletId];

  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: () => queueApi.snapshot(outletId),
    refetchInterval: 3000, // polling; realtime WS menyusul di modul Monitor+TV
  });

  const act = useMutation({
    mutationFn: ({ id, action }: { id: string; action: TicketAction }) =>
      queueApi.act(id, action),
    onSettled: () => qc.invalidateQueries({ queryKey }),
  });

  if (isLoading) return <p className="text-slate-400">Memuat antrian…</p>;
  if (error || !data)
    return <p className="text-red-600">Gagal memuat antrian.</p>;

  const actError =
    act.error instanceof ApiClientError ? act.error.message : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Panel Antrian</h1>
        <span className="text-xs text-slate-400">refresh tiap 3 dtk</span>
      </div>

      {actError && (
        <p className="rounded-2xl bg-red-50 px-4 py-2 text-sm text-red-600">
          {actError}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.platforms.map((p) => (
          <PlatformColumn
            key={p.id}
            snapshot={data}
            platformId={p.id}
            code={p.code}
            name={p.name}
            onAct={(id, action) => act.mutate({ id, action })}
            pending={act.isPending}
          />
        ))}
      </div>
    </div>
  );
}

function PlatformColumn({
  snapshot,
  platformId,
  code,
  name,
  onAct,
  pending,
}: {
  snapshot: QueueSnapshot;
  platformId: string;
  code: string;
  name: string;
  onAct: (id: string, action: TicketAction) => void;
  pending: boolean;
}) {
  const items = snapshot.tickets
    .filter((t) => t.platform_id === platformId)
    .sort((a, b) => a.number - b.number);

  return (
    <div className="rounded-3xl bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">
          <span className="text-brand">{code}</span> · {name}
        </h2>
        <span className="text-xs text-slate-400">{items.length} aktif</span>
      </div>
      {items.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-300">Kosong</p>
      ) : (
        <ul className="space-y-2">
          {items.map((t) => (
            <TicketCard key={t.id} t={t} onAct={onAct} pending={pending} />
          ))}
        </ul>
      )}
    </div>
  );
}

const STATUS_STYLE: Record<string, string> = {
  WAITING: "bg-slate-100 text-slate-600",
  CALLED: "bg-amber-100 text-amber-700",
  SERVING: "bg-brand/10 text-brand",
};

function TicketCard({
  t,
  onAct,
  pending,
}: {
  t: QueueItem;
  onAct: (id: string, action: TicketAction) => void;
  pending: boolean;
}) {
  const canSkip = t.call_count >= SKIP_MIN_CALLS;
  return (
    <li className="rounded-2xl border border-slate-100 p-3">
      <div className="flex items-center justify-between">
        <span className="text-lg font-semibold">{t.label}</span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[t.status] ?? ""}`}
        >
          {t.status}
          {t.status === "CALLED" && ` ·${t.call_count}x`}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {t.status === "WAITING" && (
          <Btn onClick={() => onAct(t.id, "call")} disabled={pending}>
            Panggil
          </Btn>
        )}
        {t.status === "CALLED" && (
          <>
            <Btn onClick={() => onAct(t.id, "call")} disabled={pending}>
              Panggil ulang
            </Btn>
            <Btn onClick={() => onAct(t.id, "serve")} disabled={pending} primary>
              Layani
            </Btn>
            <Btn
              onClick={() => onAct(t.id, "skip")}
              disabled={pending || !canSkip}
              danger
              title={canSkip ? "" : `Bisa skip setelah ${SKIP_MIN_CALLS}x panggil`}
            >
              Skip
            </Btn>
          </>
        )}
        {t.status === "SERVING" && (
          <Btn onClick={() => onAct(t.id, "complete")} disabled={pending} primary>
            Selesai
          </Btn>
        )}
      </div>
    </li>
  );
}

function Btn({
  children,
  onClick,
  disabled,
  primary,
  danger,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
  danger?: boolean;
  title?: string;
}) {
  const base =
    "rounded-full px-3 py-1.5 text-sm font-medium transition disabled:opacity-40";
  const cls = primary
    ? "bg-brand text-white hover:bg-brand-dark"
    : danger
      ? "border border-red-200 text-red-600 hover:bg-red-50"
      : "border border-slate-200 hover:bg-slate-50";
  return (
    <button onClick={onClick} disabled={disabled} title={title} className={`${base} ${cls}`}>
      {children}
    </button>
  );
}
