"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/context/AuthContext";
import {
  buildAnalyticsDashboard,
  type AnalyticsDashboard,
} from "@/lib/analytics/compute";
import { fetchAnalyticsViaApi } from "@/lib/analytics/analytics-client";
import {
  getAnalytics,
  getClientsCount,
  getCompletedEntriesSince,
} from "@/lib/firebase/firestore";

export function useAnalytics(
  companyId: string | undefined,
  waitingNow: number,
  inServiceNow: number,
  enabled = true,
) {
  const { firestoreClientReady, loading: authLoading } = useAuth();
  const [dashboard, setDashboard] = useState<AnalyticsDashboard | null>(null);
  const [loading, setLoading] = useState(Boolean(companyId && enabled));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!companyId || !enabled || authLoading) {
      setDashboard(null);
      setError("");
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    async function loadViaFirestore(since: Date) {
      const [completed, meta, clientCount] = await Promise.all([
        getCompletedEntriesSince(companyId!, since),
        getAnalytics(companyId!),
        getClientsCount(companyId!),
      ]);

      return buildAnalyticsDashboard({
        completed,
        waitingNow,
        inServiceNow,
        totalClients: clientCount,
        totalServedAllTime: meta.totalServed,
      });
    }

    async function loadViaApi(since: Date) {
      const payload = await fetchAnalyticsViaApi(companyId!, since.toISOString());
      if (!payload) return null;

      return buildAnalyticsDashboard({
        completed: payload.completed,
        waitingNow,
        inServiceNow,
        totalClients: payload.clientCount,
        totalServedAllTime: payload.meta.totalServed,
      });
    }

    async function load() {
      const since = new Date();
      since.setDate(since.getDate() - 6);
      since.setHours(0, 0, 0, 0);

      try {
        let nextDashboard: AnalyticsDashboard | null = null;

        if (firestoreClientReady) {
          try {
            nextDashboard = await loadViaFirestore(since);
          } catch {
            nextDashboard = await loadViaApi(since);
          }
        } else {
          nextDashboard = await loadViaApi(since);
        }

        if (cancelled) return;

        if (nextDashboard) {
          setDashboard(nextDashboard);
          setError("");
        } else {
          setDashboard(null);
          setError("Não foi possível carregar os analytics.");
        }
      } catch {
        if (!cancelled) {
          setDashboard(null);
          setError("Não foi possível carregar os analytics.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [companyId, enabled, authLoading, firestoreClientReady, waitingNow, inServiceNow]);

  return { dashboard, loading, error };
}
