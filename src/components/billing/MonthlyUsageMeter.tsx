"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/context/AuthContext";
import { isAppCheckMisconfigured } from "@/lib/firebase/app-check";
import { fetchMonthlyUsageViaApi } from "@/lib/queue/queue-actions";
import { useTranslations } from "@/components/providers/LocaleProvider";
import {
  getFairUseCompletionLimit,
  getMonthlyCompletionLimit,
} from "@/lib/billing/plan-limits";
import { getMonthlyCompletionCount } from "@/lib/billing/usage";
import type { Company } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

interface MonthlyUsageMeterProps {
  company: Company;
  className?: string;
}

export function MonthlyUsageMeter({ company, className }: MonthlyUsageMeterProps) {
  const { t: tb } = useTranslations("billing");
  const { firestoreClientReady } = useAuth();
  const [count, setCount] = useState<number | null>(null);

  const hardLimit = getMonthlyCompletionLimit(company);
  const fairUseLimit = getFairUseCompletionLimit(company);
  const limit = hardLimit ?? fairUseLimit;

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const value = firestoreClientReady
          ? await getMonthlyCompletionCount(company.id)
          : await fetchMonthlyUsageViaApi(company.id);
        if (!cancelled) setCount(value);
      } catch {
        if (!cancelled) setCount(null);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [company.id, firestoreClientReady]);

  if (limit === null || count === null) return null;

  const ratio = Math.min(count / limit, 1);
  const nearLimit = ratio >= 0.85;

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="text-on-surface-variant">{tb("monthlyUsageLabel")}</span>
        <span className={cn("font-medium", nearLimit ? "text-error" : "text-on-surface")}>
          {tb("monthlyUsageCount", { count: String(count), limit: String(limit) })}
        </span>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-surface-container-highest"
        role="progressbar"
        aria-valuenow={count}
        aria-valuemin={0}
        aria-valuemax={limit}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all",
            nearLimit ? "bg-error" : "bg-primary",
          )}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
    </div>
  );
}
