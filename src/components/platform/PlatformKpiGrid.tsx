"use client";

import {
  AlertTriangle,
  Building2,
  Clock,
  PauseCircle,
  UserCheck,
  Users,
} from "lucide-react";
import type { PlatformStats } from "@/lib/types";
import { useTranslations } from "@/components/providers/LocaleProvider";
import { surfaceCard } from "@/lib/ui/surface";
import { cn } from "@/lib/utils/cn";

interface PlatformKpiGridProps {
  stats: PlatformStats;
}

const cards = [
  {
    key: "totalCompanies" as const,
    labelKey: "stats.totalCompanies" as const,
    icon: Building2,
    iconWrap: "bg-primary/15 text-primary",
    value: "text-primary",
    border: "border-primary/20",
  },
  {
    key: "activeSubscriptions" as const,
    labelKey: "stats.activeSubscriptions" as const,
    icon: UserCheck,
    iconWrap: "bg-emerald-500/15 text-emerald-600",
    value: "text-emerald-700",
    border: "border-emerald-500/25",
  },
  {
    key: "pastDueCount" as const,
    labelKey: "stats.pastDue" as const,
    icon: AlertTriangle,
    iconWrap: "bg-amber-500/15 text-amber-600",
    value: "text-amber-700",
    border: "border-amber-500/25",
  },
  {
    key: "suspendedCount" as const,
    labelKey: "stats.suspended" as const,
    icon: PauseCircle,
    iconWrap: "bg-red-500/15 text-red-600",
    value: "text-red-700",
    border: "border-red-500/25",
  },
  {
    key: "totalClients" as const,
    labelKey: "stats.totalClients" as const,
    icon: Users,
    iconWrap: "bg-sky-500/15 text-sky-600",
    value: "text-sky-700",
    border: "border-sky-500/25",
  },
  {
    key: "newCompaniesLast30Days" as const,
    labelKey: "stats.newLast30Days" as const,
    icon: Clock,
    iconWrap: "bg-violet-500/15 text-violet-600",
    value: "text-violet-700",
    border: "border-violet-500/20",
  },
  {
    key: "queueWaitingNow" as const,
    labelKey: "stats.queueNow" as const,
    icon: Users,
    iconWrap: "bg-brand-navy/10 text-brand-navy",
    value: "text-brand-navy",
    border: "border-brand-navy/15",
  },
  {
    key: "pausedCount" as const,
    labelKey: "stats.paused" as const,
    icon: PauseCircle,
    iconWrap: "bg-orange-500/15 text-orange-600",
    value: "text-orange-700",
    border: "border-orange-500/25",
  },
];

export function PlatformKpiGrid({ stats }: PlatformKpiGridProps) {
  const { t } = useTranslations("platform");

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        const value = stats[card.key];
        return (
          <div
            key={card.key}
            className={cn(
              surfaceCard,
              "relative overflow-hidden border p-4",
              card.border,
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-on-surface-variant">
                  {t(card.labelKey)}
                </p>
                <p className={cn("mt-2 font-heading text-2xl font-semibold tabular-nums", card.value)}>
                  {value.toLocaleString()}
                </p>
              </div>
              <div className={cn("rounded-xl p-2.5", card.iconWrap)}>
                <Icon className="h-5 w-5" strokeWidth={2} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
