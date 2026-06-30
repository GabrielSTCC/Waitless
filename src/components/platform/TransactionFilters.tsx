"use client";

import type {
  BillingTransactionProvider,
  BillingTransactionStatus,
} from "@/lib/types";
import { useTranslations } from "@/components/providers/LocaleProvider";
import { surfaceCard } from "@/lib/ui/surface";
import { cn } from "@/lib/utils/cn";

export interface TransactionFilterValues {
  companyId: string;
  provider: BillingTransactionProvider | "";
  status: BillingTransactionStatus | "";
  dateFrom: string;
  dateTo: string;
}

interface TransactionFiltersProps {
  values: TransactionFilterValues;
  onChange: (values: TransactionFilterValues) => void;
  onApply: () => void;
  className?: string;
}

export function TransactionFilters({
  values,
  onChange,
  onApply,
  className,
}: TransactionFiltersProps) {
  const { t } = useTranslations("platform");

  function update<K extends keyof TransactionFilterValues>(
    key: K,
    value: TransactionFilterValues[K],
  ) {
    onChange({ ...values, [key]: value });
  }

  return (
    <div className={cn(surfaceCard, "p-4", className)}>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <label className="flex flex-col gap-1 text-sm xl:col-span-2">
          <span className="text-on-surface-variant">{t("finance.filters.companyId")}</span>
          <input
            type="text"
            value={values.companyId}
            onChange={(event) => update("companyId", event.target.value)}
            placeholder={t("finance.filters.companyIdPlaceholder")}
            className="rounded-lg border border-outline-variant/50 bg-surface px-3 py-2 text-sm"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-on-surface-variant">{t("finance.filters.provider")}</span>
          <select
            value={values.provider}
            onChange={(event) =>
              update("provider", event.target.value as BillingTransactionProvider | "")
            }
            className="rounded-lg border border-outline-variant/50 bg-surface px-3 py-2 text-sm"
          >
            <option value="">{t("finance.filters.all")}</option>
            <option value="stripe">Stripe</option>
            <option value="asaas">Asaas</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-on-surface-variant">{t("finance.filters.status")}</span>
          <select
            value={values.status}
            onChange={(event) =>
              update("status", event.target.value as BillingTransactionStatus | "")
            }
            className="rounded-lg border border-outline-variant/50 bg-surface px-3 py-2 text-sm"
          >
            <option value="">{t("finance.filters.all")}</option>
            <option value="paid">{t("finance.txStatus.paid")}</option>
            <option value="pending">{t("finance.txStatus.pending")}</option>
            <option value="failed">{t("finance.txStatus.failed")}</option>
            <option value="refunded">{t("finance.txStatus.refunded")}</option>
            <option value="canceled">{t("finance.txStatus.canceled")}</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-on-surface-variant">{t("finance.filters.dateFrom")}</span>
          <input
            type="date"
            value={values.dateFrom}
            onChange={(event) => update("dateFrom", event.target.value)}
            className="rounded-lg border border-outline-variant/50 bg-surface px-3 py-2 text-sm"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-on-surface-variant">{t("finance.filters.dateTo")}</span>
          <input
            type="date"
            value={values.dateTo}
            onChange={(event) => update("dateTo", event.target.value)}
            className="rounded-lg border border-outline-variant/50 bg-surface px-3 py-2 text-sm"
          />
        </label>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={onApply}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-on-primary transition-colors hover:bg-primary/90"
        >
          {t("finance.filters.apply")}
        </button>
      </div>
    </div>
  );
}
