"use client";

import { useEffect, useState } from "react";
import { searchClients } from "@/lib/firebase/firestore";
import type { Client } from "@/lib/types";

export function useClientSearch(companyId: string | undefined, term: string) {
  const [results, setResults] = useState<Client[]>([]);
  const [searching, setSearching] = useState(false);
  const isActive = Boolean(companyId && term.trim().length >= 2);

  useEffect(() => {
    if (!isActive) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const clients = await searchClients(companyId!, term);
        if (!cancelled) setResults(clients);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [companyId, term, isActive]);

  return {
    results: isActive ? results : [],
    searching: isActive && searching,
  };
}
