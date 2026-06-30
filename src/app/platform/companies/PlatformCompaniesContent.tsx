"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { PlatformRouteGuard } from "@/components/platform/PlatformRouteGuard";
import { PlatformShell } from "@/components/platform/PlatformShell";
import { CompaniesTable } from "@/components/platform/CompaniesTable";
import { fetchPlatformCompanies } from "@/lib/platform/client";
import type { PlatformCompanySummary } from "@/lib/types";
import { useTranslations } from "@/components/providers/LocaleProvider";
import { SettingsButton } from "@/components/settings/SettingsButton";
import { surfaceCard } from "@/lib/ui/surface";
import { cn } from "@/lib/utils/cn";

export default function PlatformCompaniesContent() {
  const { t } = useTranslations("platform");
  const searchParams = useSearchParams();
  const [companies, setCompanies] = useState<PlatformCompanySummary[]>([]);
  const [search, setSearch] = useState("");
  const [platformStatus, setPlatformStatus] = useState(
    searchParams.get("platformStatus") ?? "",
  );
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await fetchPlatformCompanies({
        search: search || undefined,
        platformStatus: platformStatus || undefined,
        page,
        pageSize,
      });
      setCompanies(result.companies);
      setTotal(result.total);
      setPageSize(result.pageSize);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [search, platformStatus, page, pageSize, t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPlatformStatus(searchParams.get("platformStatus") ?? "");
    setPage(1);
  }, [searchParams]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const filters = [
    { value: "", label: t("filterAll") },
    { value: "past_due", label: t("filterPastDue") },
    { value: "suspended", label: t("filterSuspended") },
    { value: "paused", label: t("filterPaused") },
  ];

  return (
    <PlatformRouteGuard>
      <PlatformShell pageTitle={t("companies")}>
        <main
          id="main-content"
          className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-10 pt-14 md:px-8 md:py-6 md:pb-8 md:pt-6"
        >
          <div className="mx-auto w-full max-w-6xl">
            <div className="mb-6">
              <h1 className="font-heading text-2xl font-semibold text-on-surface">
                {t("companiesTitle")}
              </h1>
              <p className="mt-1 text-sm text-on-surface-variant">{t("companiesSubtitle")}</p>
            </div>

            <div className={cn(surfaceCard, "mb-4 flex flex-col gap-3 p-4 md:flex-row md:items-center")}>
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
                <input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder={t("searchPlaceholder")}
                  className="w-full rounded-xl border border-outline-variant/60 bg-surface-container py-2.5 pl-10 pr-3 text-sm"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {filters.map((filter) => (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => {
                      setPlatformStatus(filter.value);
                      setPage(1);
                    }}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                      platformStatus === filter.value
                        ? "bg-primary/15 text-primary"
                        : "bg-surface-container-high text-on-surface-variant hover:text-on-surface",
                    )}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <p className="mb-4 rounded-lg border border-error/30 bg-error-container px-4 py-3 text-sm text-error">
                {error}
              </p>
            )}

            {loading ? (
              <p className="text-center text-sm text-on-surface-variant">{t("loading")}</p>
            ) : (
              <CompaniesTable companies={companies} />
            )}

            {!loading && totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between gap-3">
                <p className="text-sm text-on-surface-variant">
                  {t("page")} {page} {t("of")} {totalPages}
                </p>
                <div className="flex gap-2">
                  <SettingsButton
                    variant="secondary"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    ←
                  </SettingsButton>
                  <SettingsButton
                    variant="secondary"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    →
                  </SettingsButton>
                </div>
              </div>
            )}
          </div>
        </main>
      </PlatformShell>
    </PlatformRouteGuard>
  );
}
