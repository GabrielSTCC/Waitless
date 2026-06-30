"use client";

import { useEffect, useState } from "react";
import { PlatformRouteGuard } from "@/components/platform/PlatformRouteGuard";
import { PlatformShell } from "@/components/platform/PlatformShell";
import { fetchPlatformAudit } from "@/lib/platform/client";
import type { PlatformAuditEntry } from "@/lib/types";
import { useLocale, useTranslations } from "@/components/providers/LocaleProvider";
import { formatDisplayDateTime } from "@/lib/utils/format-date";
import { surfaceCard } from "@/lib/ui/surface";
import { cn } from "@/lib/utils/cn";

export default function PlatformAuditPage() {
  const { t } = useTranslations("platform");
  const { locale } = useLocale();
  const [entries, setEntries] = useState<PlatformAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const result = await fetchPlatformAudit({ page: 1, pageSize: 50 });
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
  }, [t]);

  return (
    <PlatformRouteGuard>
      <PlatformShell pageTitle={t("auditTitle")}>
        <main
          id="main-content"
          className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-10 pt-14 md:px-8 md:py-6 md:pb-8 md:pt-6"
        >
          <div className="mx-auto w-full max-w-6xl">
            <div className="mb-6">
              <h1 className="font-heading text-2xl font-semibold text-on-surface">
                {t("auditTitle")}
              </h1>
              <p className="mt-1 text-sm text-on-surface-variant">{t("auditSubtitle")}</p>
            </div>

            {loading && <p className="text-sm text-on-surface-variant">{t("loading")}</p>}
            {error && (
              <p className="mb-4 rounded-lg border border-error/30 bg-error-container px-4 py-3 text-sm text-error">
                {error}
              </p>
            )}

            {!loading && entries.length === 0 && (
              <p className="text-sm text-on-surface-variant">{t("auditEmpty")}</p>
            )}

            {!loading && entries.length > 0 && (
              <div className={cn(surfaceCard, "divide-y divide-outline-variant/30")}>
                {entries.map((entry) => (
                  <div key={entry.id} className="px-4 py-4 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium text-on-surface">
                        {t(`auditAction.${entry.action}`)}
                      </p>
                      <time className="text-xs text-on-surface-variant">
                        {formatDisplayDateTime(entry.createdAt, locale)}
                      </time>
                    </div>
                    <p className="mt-1 text-on-surface-variant">
                      {entry.targetCompanyName ?? entry.targetCompanyId}
                      {entry.actorEmail ? ` · ${entry.actorEmail}` : ""}
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
