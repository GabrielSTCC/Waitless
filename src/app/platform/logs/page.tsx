"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { PlatformRouteGuard } from "@/components/platform/PlatformRouteGuard";
import { PlatformShell } from "@/components/platform/PlatformShell";
import { fetchPlatformLogs } from "@/lib/platform/client";
import type {
  TenantRouteEvent,
  TenantRouteEventKind,
  TenantRouteEventLevel,
} from "@/lib/observability/tenant-route-events";
import { useLocale, useTranslations } from "@/components/providers/LocaleProvider";
import { formatDisplayDateTime } from "@/lib/utils/format-date";
import { surfaceCard } from "@/lib/ui/surface";
import { cn } from "@/lib/utils/cn";
import { SettingsButton } from "@/components/settings/SettingsButton";

const KINDS: TenantRouteEventKind[] = [
  "exception",
  "rate_limit",
  "queue_blocked",
  "trial_expired",
  "billing_failed",
  "ops",
];

export default function PlatformLogsPage() {
  const { t } = useTranslations("platform");
  const { locale } = useLocale();
  const [entries, setEntries] = useState<TenantRouteEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [level, setLevel] = useState<"" | TenantRouteEventLevel>("");
  const [kind, setKind] = useState<"" | TenantRouteEventKind>("");
  const [applied, setApplied] = useState({ companyId: "", level: "", kind: "" });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError("");
      try {
        const result = await fetchPlatformLogs({
          page: 1,
          pageSize: 50,
          companyId: applied.companyId || undefined,
          level: applied.level || undefined,
          kind: applied.kind || undefined,
        });
        if (!cancelled) setEntries(result.entries);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : t("loadError"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applied, t]);

  function handleApply(e: FormEvent) {
    e.preventDefault();
    setApplied({
      companyId: companyId.trim(),
      level,
      kind,
    });
  }

  return (
    <PlatformRouteGuard>
      <PlatformShell pageTitle={t("logs.title")}>
        <main
          id="main-content"
          className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-10 pt-14 md:px-8 md:py-6 md:pb-8 md:pt-6"
        >
          <div className="mx-auto w-full max-w-6xl">
            <div className="mb-6">
              <h1 className="font-heading text-2xl font-semibold text-on-surface">
                {t("logs.title")}
              </h1>
              <p className="mt-1 text-sm text-on-surface-variant">{t("logs.subtitle")}</p>
            </div>

            <form
              onSubmit={handleApply}
              className={cn(surfaceCard, "mb-4 grid gap-3 p-4 md:grid-cols-4 md:items-end")}
            >
              <label className="flex flex-col gap-1 text-xs font-medium text-on-surface-variant">
                {t("logs.filterCompany")}
                <input
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                  placeholder={t("logs.filterCompanyPlaceholder")}
                  className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-on-surface-variant">
                {t("logs.filterLevel")}
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value as "" | TenantRouteEventLevel)}
                  className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface"
                >
                  <option value="">{t("logs.filterAll")}</option>
                  <option value="error">{t("logs.level.error")}</option>
                  <option value="warn">{t("logs.level.warn")}</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-on-surface-variant">
                {t("logs.filterKind")}
                <select
                  value={kind}
                  onChange={(e) => setKind(e.target.value as "" | TenantRouteEventKind)}
                  className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface"
                >
                  <option value="">{t("logs.filterAll")}</option>
                  {KINDS.map((value) => (
                    <option key={value} value={value}>
                      {t(`logs.kind.${value}`)}
                    </option>
                  ))}
                </select>
              </label>
              <SettingsButton type="submit" variant="secondary" size="sm">
                {t("logs.apply")}
              </SettingsButton>
            </form>

            {loading && <p className="text-sm text-on-surface-variant">{t("loading")}</p>}
            {error && (
              <p className="mb-4 rounded-lg border border-error/30 bg-error-container px-4 py-3 text-sm text-error">
                {error}
              </p>
            )}

            {!loading && entries.length === 0 && (
              <p className="text-sm text-on-surface-variant">{t("logs.empty")}</p>
            )}

            {!loading && entries.length > 0 && (
              <div className={cn(surfaceCard, "divide-y divide-outline-variant/30")}>
                {entries.map((entry) => (
                  <div key={entry.id} className="px-4 py-4 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                            entry.level === "error"
                              ? "bg-error/15 text-error"
                              : "bg-primary/15 text-primary",
                          )}
                        >
                          {t(`logs.level.${entry.level}`)}
                        </span>
                        <span className="rounded-full bg-surface-container-high px-2 py-0.5 text-[11px] text-on-surface-variant">
                          {t(`logs.kind.${entry.kind}`)}
                        </span>
                        <p className="font-medium text-on-surface">{entry.message}</p>
                      </div>
                      <time className="text-xs text-on-surface-variant">
                        {formatDisplayDateTime(entry.createdAt, locale)}
                      </time>
                    </div>
                    <p className="mt-1 text-on-surface-variant">
                      <code className="text-xs">{entry.route}</code>
                      {entry.statusCode ? ` · HTTP ${entry.statusCode}` : ""}
                      {" · "}
                      <Link
                        href={`/platform/companies/${entry.companyId}`}
                        className="text-primary hover:underline"
                      >
                        {entry.companyName || entry.companyId}
                      </Link>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </PlatformShell>
    </PlatformRouteGuard>
  );
}
