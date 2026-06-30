"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/context/AuthContext";
import {
  subscribeInServiceQueue,
  subscribeWaitingQueue,
  syncPublicQueueSnapshots,
} from "@/lib/firebase/firestore";
import { fetchQueueViaApi } from "@/lib/queue/queue-client";
import { setQueueLive } from "@/lib/firebase/queue-live-signal";
import { useToleranceEnforcement } from "@/lib/hooks/useToleranceEnforcement";
import type { Company, QueueEntry } from "@/lib/types";

const API_POLL_MS = 4_000;
const POLL_START_DELAY_MS = 2_000;

export function useQueue(companyId: string | undefined, company?: Company | null) {
  const { firestoreClientReady, loading: authLoading } = useAuth();
  const [waiting, setWaiting] = useState<QueueEntry[]>([]);
  const [inService, setInService] = useState<QueueEntry[]>([]);
  const [connections, setConnections] = useState({
    waiting: false,
    inService: false,
  });
  const [pollingLive, setPollingLive] = useState(false);
  const companyRef = useRef(company);

  useEffect(() => {
    companyRef.current = company;
  }, [company]);

  const handleWaitingConnection = useCallback((connected: boolean) => {
    setConnections((prev) => ({ ...prev, waiting: connected }));
  }, []);

  const handleInServiceConnection = useCallback((connected: boolean) => {
    setConnections((prev) => ({ ...prev, inService: connected }));
  }, []);

  const handleWaitingUpdate = useCallback(
    async (entries: QueueEntry[]) => {
      setWaiting(entries);
      const currentCompany = companyRef.current;
      if (companyId && currentCompany && entries.length > 0) {
        try {
          await syncPublicQueueSnapshots(companyId, entries, currentCompany);
        } catch {
          // Best-effort quando o client Firestore não está disponível.
        }
      }
    },
    [companyId],
  );

  useEffect(() => {
    if (!companyId || !firestoreClientReady) return;

    const unsubWaiting = subscribeWaitingQueue(
      companyId,
      handleWaitingUpdate,
      handleWaitingConnection,
    );
    const unsubInService = subscribeInServiceQueue(
      companyId,
      setInService,
      handleInServiceConnection,
    );

    return () => {
      unsubWaiting();
      unsubInService();
    };
  }, [companyId, firestoreClientReady, handleWaitingConnection, handleInServiceConnection, handleWaitingUpdate]);

  useEffect(() => {
    if (!companyId || authLoading) {
      setPollingLive(false);
      return;
    }

    const firestoreLive =
      firestoreClientReady && connections.waiting && connections.inService;
    if (firestoreLive) {
      setPollingLive(false);
      return;
    }

    let cancelled = false;
    let pollTimer: ReturnType<typeof setInterval> | undefined;

    const poll = async () => {
      try {
        const snapshot = await fetchQueueViaApi(companyId);
        if (cancelled || !snapshot) return;

        setWaiting(snapshot.waiting);
        setInService(snapshot.inService);
        setPollingLive(true);
      } catch {
        if (!cancelled) setPollingLive(false);
      }
    };

    const startTimer = setTimeout(() => {
      if (cancelled) return;
      void poll();
      pollTimer = setInterval(() => {
        void poll();
      }, API_POLL_MS);
    }, POLL_START_DELAY_MS);

    return () => {
      cancelled = true;
      clearTimeout(startTimer);
      if (pollTimer) clearInterval(pollTimer);
      setPollingLive(false);
    };
  }, [
    authLoading,
    companyId,
    connections.inService,
    connections.waiting,
    firestoreClientReady,
  ]);

  const isLive = useMemo(
    () => pollingLive || (connections.waiting && connections.inService),
    [connections.waiting, connections.inService, pollingLive],
  );

  useToleranceEnforcement(companyId, company, waiting);

  useEffect(() => {
    setQueueLive(isLive);
    return () => setQueueLive(false);
  }, [isLive]);

  return { waiting, inService, isLive };
}
