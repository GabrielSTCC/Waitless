"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/context/AuthContext";
import { fetchClientsViaApi } from "@/lib/clients/clients-client";
import { listClients } from "@/lib/firebase/firestore";
import type { Client } from "@/lib/types";

export function useClients(companyId: string | undefined) {
  const { firestoreClientReady, loading: authLoading } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(Boolean(companyId));

  useEffect(() => {
    if (!companyId || authLoading) return;

    let cancelled = false;

    async function load() {
      setLoading(true);

      try {
        if (firestoreClientReady) {
          const data = await listClients(companyId!);
          if (!cancelled) {
            setClients(data);
            return;
          }
        }

        const viaApi = await fetchClientsViaApi(companyId!);
        if (!cancelled) setClients(viaApi ?? []);
      } catch {
        const viaApi = await fetchClientsViaApi(companyId!);
        if (!cancelled) setClients(viaApi ?? []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [companyId, authLoading, firestoreClientReady]);

  return { clients, loading };
}
