"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/context/AuthContext";
import { subscribeQueueVacancy } from "@/lib/firebase/vacancy";
import type { QueueVacancy } from "@/lib/types";

export function useQueueVacancy(companyId: string | undefined) {
  const { firestoreClientReady } = useAuth();
  const [vacancy, setVacancy] = useState<QueueVacancy | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) {
      setVacancy(null);
      setLoading(false);
      return;
    }

    if (!firestoreClientReady) {
      setVacancy(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsub = subscribeQueueVacancy(companyId, (v) => {
      setVacancy(v?.active ? v : null);
      setLoading(false);
    });

    return () => {
      unsub();
    };
  }, [companyId, firestoreClientReady]);

  return { vacancy, loading, isActive: vacancy?.active === true };
}
