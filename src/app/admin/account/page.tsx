"use client";

import { Suspense, useState } from "react";
import { AlertTriangle, UserCog } from "lucide-react";
import { useAuth } from "@/lib/context/AuthContext";
import { getSubscriptionPlanLabel, hasPaidSubscription } from "@/lib/subscription";
import { AdminShell } from "@/components/layout/AdminShell";
import { OwnerRouteGuard } from "@/components/auth/OwnerRouteGuard";
import { DeleteAccountModal } from "@/components/account/DeleteAccountModal";
import { PaymentMethodCard } from "@/components/account/PaymentMethodCard";
import { CompanyLegalCard } from "@/components/account/CompanyLegalCard";
import { SubscriptionCard } from "@/components/account/SubscriptionCard";
import { CheckoutStatusBanner } from "@/components/account/CheckoutStatusBanner";
import { ACCOUNT_DELETE_IMPACT_KEYS } from "@/components/account/impact-items";
import { InfoTip } from "@/components/ui/InfoTip";
import { useTranslations } from "@/components/providers/LocaleProvider";

export default function AccountPage() {
  const { company } = useAuth();
  const { t, locale } = useTranslations("account");
  const { t: tc } = useTranslations("common");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const hasActivePaidPlan = company ? hasPaidSubscription(company) : false;
  const activePlanLabel =
    company && hasActivePaidPlan ? getSubscriptionPlanLabel(company, locale) : "";

  return (
    <OwnerRouteGuard>
      <AdminShell>
        {company ? (
          <>
        <main
          id="main-content"
          className="relative flex min-h-0 w-full flex-1 flex-col overflow-y-auto bg-background px-4 pb-8 pt-14 md:px-6 md:py-6 md:pb-10 md:pt-6 lg:px-8"
        >
          <div className="flex w-full flex-col gap-5">
            <div>
              <div className="flex items-center gap-2">
                <UserCog className="h-6 w-6 text-primary" strokeWidth={2} />
                <h1 className="text-xl font-semibold tracking-tight text-on-surface md:text-2xl">
                  {t("title")}
                </h1>
              </div>
              <p className="mt-1 text-sm text-on-surface-variant">{t("subtitle")}</p>
            </div>

            <CompanyLegalCard company={company} />

            <Suspense fallback={null}>
              <CheckoutStatusBanner />
            </Suspense>

            <div className="grid gap-4 lg:grid-cols-2">
              <Suspense fallback={null}>
                <SubscriptionCard company={company} />
              </Suspense>
              <PaymentMethodCard />
            </div>

            <section className="rounded-2xl border border-error/40 bg-error/5 p-4 md:p-6">
              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-error/10">
                  <AlertTriangle className="h-4 w-4 text-error" strokeWidth={2} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h2 className="font-heading text-sm font-semibold text-on-surface md:text-base">
                      {t("dangerTitle")}
                    </h2>
                    <InfoTip content={t("info.delete")} label={tc("infoMore")} />
                  </div>
                  <p className="mt-0.5 text-xs text-on-surface-variant md:text-sm">
                    {t("dangerDescription")}
                  </p>
                </div>
              </div>

              <div className="grid gap-6 xl:grid-cols-[1fr_auto] xl:items-end">
                <div>
                  <p className="mb-3 text-sm font-medium text-on-surface">{t("impactIntro")}</p>
                  <ul className="grid list-inside list-disc gap-x-8 gap-y-1.5 text-sm text-on-surface-variant sm:grid-cols-2">
                    {ACCOUNT_DELETE_IMPACT_KEYS.map((key) => (
                      <li key={key}>{t(key)}</li>
                    ))}
                  </ul>
                </div>

                <div className="flex flex-col gap-3 xl:min-w-[240px]">
                  {hasActivePaidPlan && (
                    <p className="rounded-lg border border-outline-variant bg-surface-container-high px-3 py-2 text-sm text-on-surface-variant">
                      {t("activePlanHint", { plan: activePlanLabel })}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => setDeleteModalOpen(true)}
                    className="rounded-xl border border-error/50 bg-transparent px-4 py-2.5 text-sm font-medium text-error transition-colors hover:bg-error/10 xl:self-end"
                  >
                    {t("deleteButton")}
                  </button>
                </div>
              </div>
            </section>
          </div>
        </main>

        <DeleteAccountModal
          open={deleteModalOpen}
          company={company}
          onClose={() => setDeleteModalOpen(false)}
        />
          </>
        ) : (
          <div className="flex min-h-screen items-center justify-center bg-background text-on-surface-variant">
            {tc("loading")}
          </div>
        )}
      </AdminShell>
    </OwnerRouteGuard>
  );
}
