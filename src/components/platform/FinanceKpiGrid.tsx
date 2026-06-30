"use client";

import { AlertTriangle, CheckCircle2, Clock, Receipt } from "lucide-react";
import type { BillingTransactionSummary } from "@/lib/types";
import { useLocale, useTranslations } from "@/components/providers/LocaleProvider";
import { formatMoneyMinor } from "@/lib/utils/format-money";
import { surfaceCard } from "@/lib/ui/surface";
import { cn } from "@/lib/utils/cn";

interface FinanceKpiGridProps {
  summary: BillingTransactionSummary;
  currency?: "BRL" | "USD";
}

export function FinanceKpiGrid({ summary, currency = "BRL" }: FinanceKpiGridProps) {
  const { t } = useTranslations("platform");
  const { locale } = useLocale();

  const cards = [
    {
      key: "revenue",
      label: t("finance.kpi.revenueMonth"),
      value: formatMoneyMinor(summary.paidRevenueMinor, currency, locale),
      icon: CheckCircle2,
      iconWrap: "bg-emerald-500/15 text-emerald-600",
      valueClass: "text-emerald-700",
      border: "border-emerald-500/25",
    },
    {
      key: "pending",
      label: t("finance.kpi.pending"),
      value: summary.pendingCount.toLocaleString(locale),
      icon: Clock,
      iconWrap: "bg-amber-500/15 text-amber-600",
      valueClass: "text-amber-700",
      border: "border-amber-500/25",
    },
    {
      key: "failed",
      label: t("finance.kpi.failed"),
      value: summary.failedCount.toLocaleString(locale),
      icon: AlertTriangle,
      iconWrap: "bg-red-500/15 text-red-600",
      valueClass: "text-red-700",
      border: "border-red-500/25",
    },
    {
      key: "total",
      label: t("finance.kpi.filteredTotal"),
      value: summary.filteredTotal.toLocaleString(locale),
      icon: Receipt,
      iconWrap: "bg-sky-500/15 text-sky-600",
      valueClass: "text-sky-700",
      border: "border-sky-500/25",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.key}
            className={cn(surfaceCard, "relative overflow-hidden border p-4", card.border)}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-on-surface-variant">
                  {card.label}
                </p>
                <p
                  className={cn(
                    "mt-2 font-heading text-2xl font-semibold tabular-nums",
                    card.valueClass,
                  )}
                >
                  {card.value}
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
