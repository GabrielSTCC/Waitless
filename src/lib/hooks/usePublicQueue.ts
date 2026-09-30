"use client";

import { useEffect, useState } from "react";
import { ensureDb } from "@/lib/firebase/config";
import { subscribePublicQueue } from "@/lib/firebase/firestore";
import type { PublicQueueSnapshot } from "@/lib/types";

const PUBLIC_QUEUE_STALL_MS = 12_000;
const stallStartedAt = new Map<string, number>();

export function usePublicQueue(token: string | undefined) {
  const [snapshot, setSnapshot] = useState<PublicQueueSnapshot | null>(null);
  const [loading, setLoading] = useState(Boolean(token));
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!token) return;

    let unsub: (() => void) | undefined;
    let cancelled = false;
    let received = false;

    const started = stallStartedAt.get(token) ?? Date.now();
    stallStartedAt.set(token, started);
    const remaining = Math.max(0, PUBLIC_QUEUE_STALL_MS - (Date.now() - started));
    const stallTimer = window.setTimeout(() => {
      if (cancelled || received) return;
      setLoading(false);
      setConnected(false);
    }, remaining);

    void (async () => {
      try {
        await ensureDb();
        if (cancelled) return;

        unsub = subscribePublicQueue(
          token,
          (data) => {
            received = true;
            window.clearTimeout(stallTimer);
            setSnapshot(data);
            setLoading(false);
          },
          setConnected,
        );
      } catch {
        window.clearTimeout(stallTimer);
        if (!cancelled) {
          setSnapshot(null);
          setLoading(false);
          setConnected(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(stallTimer);
      unsub?.();
    };
  }, [token]);

  return {
    snapshot: token ? snapshot : null,
    loading: token ? loading : false,
    connected: token ? connected : false,
  };
}
