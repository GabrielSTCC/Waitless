"use client";

import { useEffect, useState } from "react";
import { PlatformRouteGuard } from "@/components/platform/PlatformRouteGuard";
import { PlatformShell } from "@/components/platform/PlatformShell";
import { PlatformKpiGrid } from "@/components/platform/PlatformKpiGrid";
import { fetchPlatformStats } from "@/lib/platform/client";
import type { PlatformStats } from "@/lib/types";
import { useTranslations } from "@/components/providers/LocaleProvider";
import { surfaceCard } from "@/lib/ui/surface";
import { cn } from "@/lib/utils/cn";

export default function PlatformDashboardPage() {
  const { t } = useTranslations("platform");
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await fetchPlatformStats();
        if (!cancelled) setStats(data);
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
      <PlatformShell pageTitle={t("dashboard")}>
        <main
          id="main-content"
          className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-10 pt-14 md:px-8 md:py-6 md:pb-8 md:pt-6"
        >
          <div className="mx-auto w-full max-w-6xl">
            <div
              className={cn(
                surfaceCard,
                "relative overflow-hidden bg-gradient-to-br from-brand-navy/[0.04] via-primary/[0.06] to-surface-container px-5 py-5 md:px-6",
              )}
            >
              <p className="text-xs font-medium uppercase tracking-widest text-primary">
                Waitless
              </p>
              <h1 className="mt-1 font-heading text-2xl font-semibold text-on-surface md:text-3xl">
                {t("panelTitle")}
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-on-surface-variant">
                {t("panelSubtitle")}
              </p>
            </div>

            {loading && (
              <p className="mt-8 text-center text-sm text-on-surface-variant">{t("loading")}</p>
            )}

            {error && (
              <p className="mt-6 rounded-lg border border-error/30 bg-error-container px-4 py-3 text-sm text-error">
                {error}
              </p>
            )}

            {stats && !loading && (
              <div className="mt-6">
                <PlatformKpiGrid stats={stats} />
              </div>
            )}
          </div>
        </main>
      </PlatformShell>
    </PlatformRouteGuard>
  );
}
