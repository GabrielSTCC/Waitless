"use client";

import type { BillingTransactionStatus } from "@/lib/types";
import { useTranslations } from "@/components/providers/LocaleProvider";
import { cn } from "@/lib/utils/cn";

const styles: Record<BillingTransactionStatus, string> = {
  paid: "bg-emerald-500/15 text-emerald-700",
  pending: "bg-amber-500/15 text-amber-700",
  failed: "bg-red-500/15 text-red-700",
  refunded: "bg-violet-500/15 text-violet-700",
  canceled: "bg-surface-container-high text-on-surface-variant",
};

interface TransactionStatusBadgeProps {
  status: BillingTransactionStatus;
  className?: string;
}

export function TransactionStatusBadge({ status, className }: TransactionStatusBadgeProps) {
  const { t } = useTranslations("platform");
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
        styles[status],
        className,
      )}
    >
      {t(`finance.txStatus.${status}`)}
    </span>
  );
}
