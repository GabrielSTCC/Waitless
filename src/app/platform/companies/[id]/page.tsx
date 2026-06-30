"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, PauseCircle, Play, RefreshCw, Trash2 } from "lucide-react";
import type { CompanyDetail } from "@/lib/platform/companies";
import {
  deletePlatformCompany,
  fetchPlatformCompany,
  syncPlatformCompanyStripe,
  updatePlatformCompanyControl,
} from "@/lib/platform/client";
import { PlatformRouteGuard } from "@/components/platform/PlatformRouteGuard";
import { PlatformShell } from "@/components/platform/PlatformShell";
import { CompanyDetailTabs } from "@/components/platform/CompanyDetailTabs";
import {
  PlatformActionDialog,
  type PlatformActionType,
} from "@/components/platform/PlatformActionDialog";
import { useTranslations } from "@/components/providers/LocaleProvider";
import { SettingsButton } from "@/components/settings/SettingsButton";

export default function PlatformCompanyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { t } = useTranslations("platform");
  const companyId = params.id as string;

  const [company, setCompany] = useState<CompanyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [dialogAction, setDialogAction] = useState<PlatformActionType | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchPlatformCompany(companyId);
      setCompany(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [companyId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleActionConfirm(input: { reason?: string; confirmName?: string }) {
    if (!company || !dialogAction) return;
    setActionLoading(true);
    setError("");
    try {
      if (dialogAction === "suspend") {
        await updatePlatformCompanyControl(company.id, {
          status: "suspended",
          reason: input.reason,
        });
      } else if (dialogAction === "pause") {
        await updatePlatformCompanyControl(company.id, {
          status: "paused",
          reason: input.reason,
        });
      } else if (dialogAction === "reactivate") {
        await updatePlatformCompanyControl(company.id, { status: "active", reason: input.reason });
      } else if (dialogAction === "delete") {
        await deletePlatformCompany(company.id, input.confirmName ?? "");
        router.push("/platform/companies");
        return;
      } else if (dialogAction === "syncStripe") {
        await syncPlatformCompanyStripe(company.id);
      }
      setDialogAction(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("loadError"));
    } finally {
      setActionLoading(false);
    }
  }

  const platformStatus = company?.platformControl?.status ?? "active";

  return (
    <PlatformRouteGuard>
      <PlatformShell pageTitle={t("detailTitle")}>
        <main
          id="main-content"
          className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-10 pt-14 md:px-8 md:py-6 md:pb-8 md:pt-6"
        >
          <div className="mx-auto w-full max-w-6xl">
            <button
              type="button"
              onClick={() => router.push("/platform/companies")}
              className="mb-4 inline-flex items-center gap-2 text-sm text-on-surface-variant hover:text-on-surface"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("companies")}
            </button>

            {loading && <p className="text-sm text-on-surface-variant">{t("loading")}</p>}

            {error && (
              <p className="mb-4 rounded-lg border border-error/30 bg-error-container px-4 py-3 text-sm text-error">
                {error}
              </p>
            )}

            {company && !loading && (
              <>
                <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h1 className="font-heading text-2xl font-semibold text-on-surface">
                      {company.name}
                    </h1>
                    <p className="text-sm text-on-surface-variant">{company.ownerEmail}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {platformStatus !== "active" ? (
                      <SettingsButton
                        variant="secondary"
                        size="sm"
                        icon={Play}
                        onClick={() => setDialogAction("reactivate")}
                      >
                        {t("actions.reactivate")}
                      </SettingsButton>
                    ) : (
                      <>
                        <SettingsButton
                          variant="secondary"
                          size="sm"
                          icon={PauseCircle}
                          onClick={() => setDialogAction("suspend")}
                        >
                          {t("actions.suspend")}
                        </SettingsButton>
                        <SettingsButton
                          variant="secondary"
                          size="sm"
                          icon={PauseCircle}
                          onClick={() => setDialogAction("pause")}
                        >
                          {t("actions.pause")}
                        </SettingsButton>
                      </>
                    )}
                    <SettingsButton
                      variant="secondary"
                      size="sm"
                      icon={RefreshCw}
                      onClick={() => setDialogAction("syncStripe")}
                    >
                      {t("actions.syncStripe")}
                    </SettingsButton>
                    <SettingsButton
                      variant="secondary"
                      size="sm"
                      icon={Trash2}
                      onClick={() => setDialogAction("delete")}
                      className="text-error"
                    >
                      {t("actions.delete")}
                    </SettingsButton>
                  </div>
                </div>

                <CompanyDetailTabs
                  company={company}
                  onSubscriptionUpdated={(updated) => setCompany(updated)}
                />
              </>
            )}
          </div>
        </main>

        <PlatformActionDialog
          open={dialogAction !== null}
          action={dialogAction}
          companyName={company?.name ?? ""}
          loading={actionLoading}
          onClose={() => setDialogAction(null)}
          onConfirm={handleActionConfirm}
        />
      </PlatformShell>
    </PlatformRouteGuard>
  );
}
