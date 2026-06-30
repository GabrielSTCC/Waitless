"use client";

import { useCallback, useState } from "react";
import type { ClientVisitRecord } from "@/lib/client/visit-log";

interface HistoryResponse {
  visits: ClientVisitRecord[];
  activeEntryId: string | null;
}

export function useClientHistory(token: string | undefined) {
  const [visits, setVisits] = useState<ClientVisitRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);

  const fetchHistory = useCallback(async () => {
    if (!token || loaded) return;

    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/queue/client-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = (await res.json()) as HistoryResponse & { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Erro ao carregar histórico.");
        return;
      }
      setVisits(data.visits ?? []);
      setLoaded(true);
    } catch {
      setError("Erro ao carregar histórico.");
    } finally {
      setLoading(false);
    }
  }, [token, loaded]);

  return { visits, loading, error, fetchHistory, loaded };
}
