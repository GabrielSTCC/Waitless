"use client";

import { Check } from "lucide-react";
import { useTranslations } from "@/components/providers/LocaleProvider";
import { getPlanFeatureKeys } from "@/lib/billing/plan-features";
import type { PlanTier } from "@/lib/billing/plans";
import { cn } from "@/lib/utils/cn";

interface PlanFeaturesListProps {
  planId: PlanTier;
  className?: string;
  compact?: boolean;
}

export function PlanFeaturesList({ planId, className, compact = false }: PlanFeaturesListProps) {
  const { t } = useTranslations("pricing");
  const keys = getPlanFeatureKeys(planId);

  return (
    <ul
      className={cn(
        "flex flex-col text-on-surface-variant",
        compact ? "gap-1.5 text-xs" : "gap-2.5 text-sm",
        className,
      )}
    >
      {keys.map((key) => (
        <li key={key} className="flex items-start gap-2">
          <Check
            className={cn("shrink-0 text-primary", compact ? "mt-0.5 h-3.5 w-3.5" : "mt-0.5 h-4 w-4")}
            strokeWidth={2}
          />
          <span>{t(key)}</span>
        </li>
      ))}
    </ul>
  );
}
