"use client";

// Subscribe ke topic WebSocket backend; tiap event memicu refetch query terkait.
// Auto-reconnect; polling refetchInterval tetap sebagai fallback.
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { API_BASE } from "./api";

export function useRealtime(topic: string | null, queryKey: unknown[]) {
  const qc = useQueryClient();
  const keyStr = JSON.stringify(queryKey);

  useEffect(() => {
    if (!topic) return;
    const url = API_BASE.replace(/^http/, "ws") + "/ws";
    let ws: WebSocket | null = null;
    let closed = false;
    let retry: ReturnType<typeof setTimeout> | undefined;

    const connect = () => {
      ws = new WebSocket(url);
      ws.onopen = () => ws?.send(JSON.stringify({ subscribe: topic }));
      ws.onmessage = (e) => {
        try {
          if (JSON.parse(e.data).type === "subscribed") return;
        } catch {}
        qc.invalidateQueries({ queryKey });
      };
      ws.onclose = () => {
        if (!closed) retry = setTimeout(connect, 2000);
      };
      ws.onerror = () => ws?.close();
    };
    connect();

    return () => {
      closed = true;
      if (retry) clearTimeout(retry);
      ws?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic, keyStr]);
}
