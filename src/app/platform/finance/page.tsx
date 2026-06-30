"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PlatformRouteGuard } from "@/components/platform/PlatformRouteGuard";
import { PlatformShell } from "@/components/platform/PlatformShell";
import { FinanceKpiGrid } from "@/components/platform/FinanceKpiGrid";
import {
  TransactionFilters,
  type TransactionFilterValues,
} from "@/components/platform/TransactionFilters";
import { TransactionsTable } from "@/components/platform/TransactionsTable";
import { fetchPlatformTransactions } from "@/lib/platform/client";
import type { BillingTransaction, BillingTransactionSummary } from "@/lib/types";
import { useTranslations } from "@/components/providers/LocaleProvider";
import { surfaceCard } from "@/lib/ui/surface";
import { cn } from "@/lib/utils/cn";

const PAGE_SIZE = 30;

function emptyFilters(companyId = ""): TransactionFilterValues {
  return {
    companyId,
    provider: "",
    status: "",
    dateFrom: "",
    dateTo: "",
  };
}

export default function PlatformFinancePage() {
  const { t } = useTranslations("platform");
  const searchParams = useSearchParams();
  const initialCompanyId = searchParams.get("companyId")?.trim() ?? "";

  const [draftFilters, setDraftFilters] = useState<TransactionFilterValues>(() =>
    emptyFilters(initialCompanyId),
  );
  const [appliedFilters, setAppliedFilters] = useState<TransactionFilterValues>(() =>
    emptyFilters(initialCompanyId),
  );
  const [transactions, setTransactions] = useState<BillingTransaction[]>([]);
  const [summary, setSummary] = useState<BillingTransactionSummary | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [indexPending, setIndexPending] = useState(false);

  const queryParams = useMemo(
    () => ({
      page,
      pageSize: PAGE_SIZE,
      companyId: appliedFilters.companyId || undefined,
      provider: appliedFilters.provider || undefined,
      status: appliedFilters.status || undefined,
      dateFrom: appliedFilters.dateFrom || undefined,
      dateTo: appliedFilters.dateTo || undefined,
    }),
    [appliedFilters, page],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await fetchPlatformTransactions(queryParams);
      setTransactions(result.transactions);
      setSummary(result.summary);
      setTotal(result.total);
      setIndexPending(result.indexPending === true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [queryParams, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function handleApplyFilters() {
    setPage(1);
    setAppliedFilters(draftFilters);
  }

  return (
    <PlatformRouteGuard>
      <PlatformShell pageTitle={t("finance.title")}>
        <main
          id="main-content"
          className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-10 pt-14 md:px-8 md:py-6 md:pb-8 md:pt-6"
        >
          <div className="mx-auto w-full max-w-6xl space-y-6">
            <div
              className={cn(
                surfaceCard,
                "relative overflow-hidden bg-gradient-to-br from-brand-navy/[0.04] via-primary/[0.06] to-surface-container px-5 py-5 md:px-6",
              )}
            >
              <p className="text-xs font-medium uppercase tracking-widest text-primary">
                {t("sections.finance")}
              </p>
              <h1 className="mt-1 font-heading text-2xl font-semibold text-on-surface md:text-3xl">
                {t("finance.title")}
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-on-surface-variant">
                {t("finance.subtitle")}
              </p>
            </div>

            {summary && !loading && <FinanceKpiGrid summary={summary} />}

            <TransactionFilters
              values={draftFilters}
              onChange={setDraftFilters}
              onApply={handleApplyFilters}
            />

            {loading && (
              <p className="text-center text-sm text-on-surface-variant">{t("loading")}</p>
            )}

            {error && (
              <p className="rounded-lg border border-error/30 bg-error-container px-4 py-3 text-sm text-error">
                {error}
              </p>
            )}

            {indexPending && !loading && !error && (
              <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800">
                {t("finance.indexPending")}
              </p>
            )}

            {!loading && !error && <TransactionsTable transactions={transactions} />}

            {!loading && totalPages > 1 && (
              <div className="flex items-center justify-between gap-3 text-sm">
                <p className="text-on-surface-variant">
                  {t("page")} {page} {t("of")} {totalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    className="rounded-lg border border-outline-variant/50 px-3 py-1.5 disabled:opacity-40"
                  >
                    {t("finance.prevPage")}
                  </button>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                    className="rounded-lg border border-outline-variant/50 px-3 py-1.5 disabled:opacity-40"
                  >
                    {t("finance.nextPage")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </PlatformShell>
    </PlatformRouteGuard>
  );
}
