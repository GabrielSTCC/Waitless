"use client";

import Link from "next/link";
import { Copy } from "lucide-react";
import type { BillingTransaction } from "@/lib/types";
import { getPlanDisplayName } from "@/lib/billing/plans";
import { useLocale, useTranslations } from "@/components/providers/LocaleProvider";
import { TransactionStatusBadge } from "@/components/platform/TransactionStatusBadge";
import { formatDisplayDateTime } from "@/lib/utils/format-date";
import { formatMoneyMinor } from "@/lib/utils/format-money";
import { surfaceCard } from "@/lib/ui/surface";
import { cn } from "@/lib/utils/cn";

interface TransactionsTableProps {
  transactions: BillingTransaction[];
  className?: string;
}

export function TransactionsTable({ transactions, className }: TransactionsTableProps) {
  const { t } = useTranslations("platform");
  const { locale } = useLocale();

  if (transactions.length === 0) {
    return (
      <div className={cn(surfaceCard, "p-8 text-center text-sm text-on-surface-variant", className)}>
        {t("finance.empty")}
      </div>
    );
  }

  async function copyId(id: string) {
    try {
      await navigator.clipboard.writeText(id);
    } catch {
      // ignore
    }
  }

  return (
    <div className={cn(surfaceCard, "overflow-hidden", className)}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead>
            <tr className="border-b border-outline-variant/40 bg-surface-container-low/60 text-xs uppercase tracking-wide text-on-surface-variant">
              <th className="px-4 py-3 font-medium">{t("finance.col.date")}</th>
              <th className="px-4 py-3 font-medium">{t("finance.col.company")}</th>
              <th className="px-4 py-3 font-medium">{t("finance.col.provider")}</th>
              <th className="px-4 py-3 font-medium">{t("finance.col.amount")}</th>
              <th className="px-4 py-3 font-medium">{t("finance.col.status")}</th>
              <th className="px-4 py-3 font-medium">{t("finance.col.type")}</th>
              <th className="px-4 py-3 font-medium">{t("finance.col.plan")}</th>
              <th className="px-4 py-3 font-medium">{t("finance.col.externalId")}</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr key={tx.id} className="border-b border-outline-variant/20">
                <td className="px-4 py-3 whitespace-nowrap text-on-surface-variant">
                  {formatDisplayDateTime(tx.occurredAt, locale)}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/platform/companies/${tx.companyId}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {tx.companyName}
                  </Link>
                  <p className="font-mono text-xs text-on-surface-variant">{tx.companyId}</p>
                </td>
                <td className="px-4 py-3 capitalize">{tx.provider}</td>
                <td className="px-4 py-3 tabular-nums font-medium">
                  {formatMoneyMinor(tx.amountMinor, tx.currency, locale)}
                </td>
                <td className="px-4 py-3">
                  <TransactionStatusBadge status={tx.status} />
                </td>
                <td className="px-4 py-3 capitalize">{tx.billingType}</td>
                <td className="px-4 py-3">
                  {tx.planId ? getPlanDisplayName(tx.planId, locale) : "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <span className="max-w-[140px] truncate font-mono text-xs">
                      {tx.externalId}
                    </span>
                    <button
                      type="button"
                      onClick={() => void copyId(tx.externalId)}
                      className="rounded p-1 text-on-surface-variant hover:bg-surface-container-high"
                      aria-label={t("finance.copyId")}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
