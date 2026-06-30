"use client";

import { useEffect, useRef } from "react";
import { removeQueueEntryDueToTolerance } from "@/lib/firebase/firestore";
import type { Company, QueueEntry } from "@/lib/types";

export function useToleranceEnforcement(
  companyId: string | undefined,
  company: Company | null | undefined,
  waiting: QueueEntry[],
) {
  const processingRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!companyId || !company?.toleranceEnabled) return;

    const now = Date.now();
    const expired = waiting.filter(
      (entry) =>
        entry.toleranceExpiresAt && entry.toleranceExpiresAt.getTime() <= now,
    );

    for (const entry of expired) {
      if (processingRef.current.has(entry.id)) continue;
      processingRef.current.add(entry.id);

      removeQueueEntryDueToTolerance(companyId, entry, company, waiting)
        .catch(() => undefined)
        .finally(() => {
          processingRef.current.delete(entry.id);
        });
    }
  }, [companyId, company, waiting]);
}
