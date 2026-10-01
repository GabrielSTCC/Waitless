"use client";

import { useEffect, useState } from "react";
import { ensureDb } from "@/lib/firebase/config";
import { subscribePublicQueue } from "@/lib/firebase/firestore";
import type { PublicQueueSnapshot } from "@/lib/types";

const PUBLIC_QUEUE_STALL_MS = 8_000;
const MAX_CONNECT_ATTEMPTS = 3;

export function usePublicQueue(token: string | undefined) {
  const [snapshot, setSnapshot] = useState<PublicQueueSnapshot | null>(null);
  const [loading, setLoading] = useState(Boolean(token));
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!token) return;
    const queueToken = token;

    let unsub: (() => void) | undefined;
    let cancelled = false;
    let received = false;
    let attempt = 0;
    let retryTimer: number | undefined;
    let stallTimer: number | undefined;

    function clearTimers() {
      if (retryTimer !== undefined) window.clearTimeout(retryTimer);
      if (stallTimer !== undefined) window.clearTimeout(stallTimer);
      retryTimer = undefined;
      stallTimer = undefined;
    }

    function fail() {
      clearTimers();
      if (cancelled) return;
      setSnapshot(null);
      setLoading(false);
      setConnected(false);
    }

    function armStall() {
      if (stallTimer !== undefined) window.clearTimeout(stallTimer);
      stallTimer = window.setTimeout(() => {
        if (cancelled || received) return;
        unsub?.();
        unsub = undefined;
        if (attempt >= MAX_CONNECT_ATTEMPTS) {
          fail();
          return;
        }
        void connect();
      }, PUBLIC_QUEUE_STALL_MS);
    }

    async function connect() {
      if (cancelled) return;
      attempt += 1;

      try {
        await ensureDb();
        if (cancelled) return;

        unsub = subscribePublicQueue(
          queueToken,
          (data) => {
            received = true;
            clearTimers();
            setSnapshot(data);
            setLoading(false);
          },
          setConnected,
        );
        armStall();
      } catch {
        if (cancelled) return;
        if (attempt < MAX_CONNECT_ATTEMPTS) {
          retryTimer = window.setTimeout(() => {
            void connect();
          }, 600 * attempt);
          return;
        }
        fail();
      }
    }

    void connect();

    return () => {
      cancelled = true;
      clearTimers();
      unsub?.();
    };
  }, [token]);

  return {
    snapshot: token ? snapshot : null,
    loading: token ? loading : false,
    connected: token ? connected : false,
  };
}
