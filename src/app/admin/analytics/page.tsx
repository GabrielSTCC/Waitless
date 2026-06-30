"use client";

import { useAuth } from "@/lib/context/AuthContext";
import { useQueue } from "@/lib/hooks/useQueue";
import { useAnalytics } from "@/lib/hooks/useAnalytics";
import { usePlanLimits } from "@/lib/hooks/usePlanLimits";
import { RoleRouteGuard } from "@/components/auth/RoleRouteGuard";
import { AdminShell } from "@/components/layout/AdminShell";
import { PlanUpgradeNotice } from "@/components/billing/PlanUpgradeNotice";
import { KpiGrid } from "@/components/analytics/KpiGrid";
import {
  HourlyChart,
  OperationsSummary,
  WaitDistributionChart,
  WeeklyTrendChart,
} from "@/components/analytics/AnalyticsCharts";
import { useTranslations } from "@/components/providers/LocaleProvider";
import { LiveBadge } from "@/components/queue/LiveBadge";
import { surfaceCard } from "@/lib/ui/surface";
import { cn } from "@/lib/utils/cn";

export default function AnalyticsPage() {
  const { member, company } = useAuth();
  const { t } = useTranslations("analytics");
  const planLimits = usePlanLimits(company);
  const companyId = member?.companyId;
  const { waiting, inService, isLive } = useQueue(companyId, company);
  const { dashboard, loading, error } = useAnalytics(
    companyId,
    waiting.length,
    inService.length,
    planLimits.canUseBasicAnalytics,
  );

  return (
    <RoleRouteGuard>
    <AdminShell>
      <main
        id="main-content"
        className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-10 pt-14 md:px-8 md:py-6 md:pb-8 md:pt-6"
      >
        <div className="mx-auto w-full max-w-6xl">
          <div className={cn(surfaceCard, "relative overflow-hidden bg-gradient-to-br from-brand-navy/[0.04] via-primary/[0.06] to-surface-container px-5 py-5 md:px-6")}>
            <div
              className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/10 blur-2xl"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -bottom-10 left-1/3 h-24 w-24 rounded-full bg-sky-500/10 blur-2xl"
              aria-hidden
            />
            <div className="relative flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-primary">
                  Painel operacional
                </p>
                <h2 className="mt-1 font-heading text-xl font-semibold text-on-surface md:text-2xl">
                  {t("title")}
                </h2>
                <p className="mt-1 max-w-xl text-sm text-on-surface-variant">{t("subtitle")}</p>
              </div>
              <LiveBadge isLive={isLive} />
            </div>
          </div>

          {loading && (
            <p className="mt-10 text-center text-sm text-on-surface-variant">
              {t("loadingMetrics")}
            </p>
          )}

          {error && planLimits.canUseBasicAnalytics && (
            <p className="mt-6 rounded-lg border border-error/30 bg-error-container px-4 py-3 text-sm text-error">
              {error}
            </p>
          )}

          {!planLimits.canUseBasicAnalytics && !loading && (
            <div className="mt-6">
              <PlanUpgradeNotice feature="analytics" />
            </div>
          )}

          {dashboard && !loading && planLimits.canUseBasicAnalytics && (
            <div className="mt-5 flex flex-col gap-5">
              <KpiGrid kpis={dashboard.kpis} />

              {planLimits.canUseFullAnalytics ? (
                <>
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <WeeklyTrendChart data={dashboard.dailyWeek} />
                    <HourlyChart data={dashboard.hourlyToday} />
                  </div>

                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <WaitDistributionChart data={dashboard.waitDistribution} />
                    <OperationsSummary dashboard={dashboard} />
                  </div>
                </>
              ) : (
                <>
                  <OperationsSummary dashboard={dashboard} />
                  <PlanUpgradeNotice feature="analyticsFull" />
                </>
              )}
            </div>
          )}
        </div>
      </main>
    </AdminShell>
    </RoleRouteGuard>
  );
}
