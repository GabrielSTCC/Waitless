"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/context/AuthContext";
import {
  addExistingClientToQueue,
  ClientAlreadyInQueueError,
  PlanLimitError,
  updateQueueStatus,
  upsertClientAndAddToQueue,
} from "@/lib/queue/queue-actions";
import { assignVacancyManually } from "@/lib/firebase/vacancy";
import { useQueue } from "@/lib/hooks/useQueue";
import { useClientSearch } from "@/lib/hooks/useClientSearch";
import { useTranslations } from "@/components/providers/LocaleProvider";
import { AdminShell } from "@/components/layout/AdminShell";
import { SearchBar } from "@/components/layout/SearchBar";
import { ClientSearchResults } from "@/components/clients/ClientSearchResults";
import { LiveBadge } from "@/components/queue/LiveBadge";
import { QueueColumn } from "@/components/queue/QueueColumn";
import { VacancyPanel } from "@/components/queue/VacancyPanel";
import { useQueueVacancy } from "@/lib/hooks/useQueueVacancy";
import { usePlanLimits } from "@/lib/hooks/usePlanLimits";
import { canOperateQueue, TrialExpiredError } from "@/lib/billing/trial";
import { MonthlyUsageMeter } from "@/components/billing/MonthlyUsageMeter";
import type { Client } from "@/lib/types";

export default function AdminDashboardPage() {
  const router = useRouter();
  const { member, company, loading, user } = useAuth();
  const { t } = useTranslations("queue");
  const { t: tc } = useTranslations("common");
  const companyId = member?.companyId;
  const avgServiceTimeMin = company?.avgServiceTimeMin ?? 10;

  const { waiting, inService, isLive } = useQueue(companyId, company);

  const { vacancy } = useQueueVacancy(companyId);
  const planLimits = usePlanLimits(company);
  const operationsDisabled = company ? !canOperateQueue(company) : false;
  const [search, setSearch] = useState("");
  const { results, searching } = useClientSearch(companyId, search);
  const [actionError, setActionError] = useState("");

  const handleQueueError = useCallback(
    (err: unknown) => {
      if (err instanceof ClientAlreadyInQueueError) {
        setActionError(err.message);
        return;
      }
      if (err instanceof PlanLimitError) {
        setActionError(err.message);
        return;
      }
      if (err instanceof TrialExpiredError) {
        setActionError(err.message);
        return;
      }
      setActionError(err instanceof Error ? err.message : t("addToQueueError"));
    },
    [t],
  );

  const handleAddToQueue = useCallback(
    async (data: { name: string; whatsapp: string }) => {
      if (!companyId) return;
      setActionError("");
      try {
        await upsertClientAndAddToQueue(companyId, data, avgServiceTimeMin);
        setSearch("");
      } catch (err) {
        handleQueueError(err);
        throw err;
      }
    },
    [companyId, avgServiceTimeMin, handleQueueError],
  );

  const handleSelectClient = useCallback(
    async (client: Client) => {
      if (!companyId) return;
      setActionError("");
      try {
        await addExistingClientToQueue(companyId, client, avgServiceTimeMin);
        setSearch("");
      } catch (err) {
        handleQueueError(err);
      }
    },
    [companyId, avgServiceTimeMin, handleQueueError],
  );

  const handleStart = useCallback(
    async (entryId: string) => {
      if (!companyId) return;
      await updateQueueStatus(companyId, entryId, "in_service");
    },
    [companyId],
  );

  const handleFinish = useCallback(
    async (entryId: string) => {
      if (!companyId) return;
      await updateQueueStatus(companyId, entryId, "completed");
    },
    [companyId],
  );

  const handleAssignVacancy = useCallback(
    async (entryId: string) => {
      if (!companyId) return;
      await assignVacancyManually(companyId, entryId);
    },
    [companyId],
  );

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/admin/auth");
      return;
    }
    if (!loading && user && !member) {
      router.replace("/admin/onboarding");
    }
  }, [loading, user, member, router]);

  if (loading || (member && !company) || (!loading && !user)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-on-surface-variant">
        {tc("loadingPanel")}
      </div>
    );
  }

  if (!company) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-on-surface-variant">
        {tc("loadingPanel")}
      </div>
    );
  }

  return (
    <AdminShell onAddCustomerSubmit={handleAddToQueue}>
      <main
        id="main-content"
        className="relative flex min-h-0 w-full flex-1 flex-col overflow-y-auto bg-background px-4 pb-10 pt-14 md:px-8 md:py-6 md:pb-8 md:pt-6"
      >
        <div className="mx-auto w-full max-w-6xl">
          <div className="mb-6 flex flex-col gap-4 md:mb-8 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-on-surface md:text-2xl">
                {t("title")}
              </h2>
              <p className="mt-1 text-sm text-on-surface-variant">
                {t("subtitle", { company: company.name })}
              </p>
              <MonthlyUsageMeter company={company} className="mt-3 max-w-xs" />
            </div>
            <LiveBadge isLive={isLive} />
          </div>

          <SearchBar value={search} onChange={setSearch} disabled={operationsDisabled} />
          <ClientSearchResults
            results={results}
            searching={searching}
            onSelect={handleSelectClient}
            visible={search.trim().length >= 2 && !operationsDisabled}
          />
          {actionError && (
            <p className="-mt-2 mb-4 text-sm text-error">{actionError}</p>
          )}

          {vacancy && companyId && planLimits.canUseTolerance && (
            <VacancyPanel companyId={companyId} vacancy={vacancy} waiting={waiting} />
          )}

          <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-2 md:gap-6">
            <QueueColumn
              variant="waiting"
              entries={waiting}
              avgServiceTimeMin={avgServiceTimeMin}
              toleranceEnabled={company.toleranceEnabled}
              toleranceMin={company.toleranceMin}
              companyId={companyId}
              companyName={company.name}
              vacancy={vacancy}
              onStart={handleStart}
              onAssignVacancy={handleAssignVacancy}
              operationsDisabled={operationsDisabled}
            />
            <QueueColumn
              variant="in_service"
              entries={inService}
              avgServiceTimeMin={avgServiceTimeMin}
              onFinish={handleFinish}
              operationsDisabled={operationsDisabled}
            />
          </div>
        </div>
      </main>
    </AdminShell>
  );
}
