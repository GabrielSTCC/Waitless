"use client";

import Link from "next/link";
import { AlertTriangle, Clock } from "lucide-react";
import type { Company } from "@/lib/types";
import {
  canOperateQueue,
  getTrialDaysRemaining,
  isSignupTrial,
  isTrialActive,
  isTrialExpired,
} from "@/lib/billing/trial";
import { useLocale, useTranslations } from "@/components/providers/LocaleProvider";

interface TrialBannerProps {
  company: Company;
}

export function TrialBanner({ company }: TrialBannerProps) {
  const { t } = useTranslations("billing");
  const { locale } = useLocale();

  if (!isSignupTrial(company) && !isTrialExpired(company)) return null;

  const trialEndsAt = company.subscription?.trialEndsAt;
  const expired = isTrialExpired(company);
  const active = isTrialActive(company);
  const daysRemaining = getTrialDaysRemaining(company);

  if (!expired && !active) return null;

  const endsAtLabel = trialEndsAt
    ? trialEndsAt.toLocaleDateString(locale)
    : "";

  return (
    <div
      className={
        expired
          ? "border-b border-error/30 bg-error/10 px-4 py-3 md:px-8"
          : "border-b border-sky-500/30 bg-sky-500/10 px-4 py-3 md:px-8"
      }
    >
      <div className="mx-auto flex max-w-6xl items-start gap-3">
        {expired ? (
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-error" />
        ) : (
          <Clock className="mt-0.5 h-5 w-5 shrink-0 text-sky-700 dark:text-sky-300" />
        )}
        <div className="min-w-0 flex-1 text-sm">
          <p
            className={
              expired
                ? "font-medium text-error"
                : "font-medium text-sky-900 dark:text-sky-100"
            }
          >
            {expired
              ? t("trial.expiredBanner")
              : t("trial.activeBanner", { days: String(daysRemaining), date: endsAtLabel })}
          </p>
          {!canOperateQueue(company) && (
            <p className="mt-1 text-on-surface-variant">{t("trial.readOnlyHint")}</p>
          )}
          <Link
            href="/admin/account"
            className="mt-2 inline-block font-medium text-primary underline-offset-2 hover:underline"
          >
            {t("trial.subscribeCta")}
          </Link>
        </div>
      </div>
    </div>
  );
}
