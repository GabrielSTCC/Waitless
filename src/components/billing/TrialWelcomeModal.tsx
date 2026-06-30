"use client";

import Link from "next/link";
import { Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Company } from "@/lib/types";
import { getTrialDaysRemaining } from "@/lib/billing/trial";
import { dismissTrialWelcome } from "@/lib/billing/trial-intro-storage";
import { PlanFeaturesList } from "@/components/billing/PlanFeaturesList";
import { useLocale, useTranslations } from "@/components/providers/LocaleProvider";
import { surfaceModal } from "@/lib/ui/surface";
import { cn } from "@/lib/utils/cn";

interface TrialWelcomeModalProps {
  open: boolean;
  company: Company;
  onClose: () => void;
}

export function TrialWelcomeModal({ open, company, onClose }: TrialWelcomeModalProps) {
  const { t } = useTranslations("billing");
  const { locale } = useLocale();

  const trialEndsAt = company.subscription?.trialEndsAt;
  const daysRemaining = getTrialDaysRemaining(company);
  const endsAtLabel = trialEndsAt ? trialEndsAt.toLocaleDateString(locale) : "";

  function handleDismiss() {
    dismissTrialWelcome(company.id);
    onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
            onClick={handleDismiss}
            aria-hidden
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="trial-welcome-title"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            className={cn(
              "fixed left-1/2 top-1/2 z-[60] flex max-h-[min(90vh,720px)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden",
              surfaceModal,
            )}
          >
            <div className="custom-scrollbar overflow-y-auto p-6">
              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/15 text-sky-700 dark:text-sky-300">
                  <Clock className="h-5 w-5" strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1">
                  <h2
                    id="trial-welcome-title"
                    className="font-heading text-lg font-semibold text-on-surface sm:text-xl"
                  >
                    {t("trial.welcome.title")}
                  </h2>
                  <p className="mt-1 text-sm text-on-surface-variant">
                    {t("trial.welcome.subtitle")}
                  </p>
                  {endsAtLabel && (
                    <p className="mt-2 inline-flex rounded-full bg-sky-500/10 px-2.5 py-1 text-xs font-medium text-sky-800 dark:text-sky-200">
                      {t("trial.welcome.daysLeft", {
                        days: String(daysRemaining),
                        date: endsAtLabel,
                      })}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-3 text-sm text-on-surface-variant">
                <p>{t("trial.welcome.howItWorks")}</p>
                <p>{t("trial.welcome.afterTrial")}</p>
              </div>

              <section className="mt-5 rounded-xl border border-outline-variant/60 bg-surface-container-low/50 p-4">
                <h3 className="text-sm font-medium text-on-surface">
                  {t("trial.welcome.currentPlanTitle")}
                </h3>
                <PlanFeaturesList planId="free" compact className="mt-3" />
              </section>

              <section className="mt-5">
                <h3 className="mb-3 text-sm font-medium text-on-surface">
                  {t("trial.welcome.paidPlansTitle")}
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-outline-variant/60 bg-surface-container-low/40 p-3">
                    <p className="text-sm font-semibold text-primary">
                      {t("trial.welcome.essentialLabel")}
                    </p>
                    <PlanFeaturesList planId="essential" compact className="mt-2" />
                  </div>
                  <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
                    <p className="text-sm font-semibold text-primary">
                      {t("trial.welcome.proLabel")}
                    </p>
                    <PlanFeaturesList planId="pro" compact className="mt-2" />
                  </div>
                </div>
              </section>
            </div>

            <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-outline-variant/40 bg-surface-container-low/30 p-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleDismiss}
                className="rounded-xl border border-outline-variant px-4 py-2.5 text-sm font-medium text-on-surface transition-colors hover:bg-surface-container-high"
              >
                {t("trial.welcome.dismiss")}
              </button>
              <Link
                href="/admin/account"
                onClick={handleDismiss}
                className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-center text-sm font-medium text-on-primary transition-colors hover:bg-primary/90"
              >
                {t("trial.welcome.viewPlans")}
              </Link>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
