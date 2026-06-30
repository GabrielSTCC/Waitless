"use client";

import { useEffect, useState } from "react";
import { ensureDb } from "@/lib/firebase/config";
import { subscribePublicQueue } from "@/lib/firebase/firestore";
import type { PublicQueueSnapshot } from "@/lib/types";

export function usePublicQueue(token: string | undefined) {
  const [snapshot, setSnapshot] = useState<PublicQueueSnapshot | null>(null);
  const [loading, setLoading] = useState(Boolean(token));
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!token) return;

    let unsub: (() => void) | undefined;
    let cancelled = false;

    void (async () => {
      try {
        await ensureDb();
        if (cancelled) return;

        unsub = subscribePublicQueue(
          token,
          (data) => {
            setSnapshot(data);
            setLoading(false);
          },
          setConnected,
        );
      } catch {
        if (!cancelled) {
          setSnapshot(null);
          setLoading(false);
          setConnected(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      unsub?.();
    };
  }, [token]);

  return {
    snapshot: token ? snapshot : null,
    loading: token ? loading : false,
    connected: token ? connected : false,
  };
}
