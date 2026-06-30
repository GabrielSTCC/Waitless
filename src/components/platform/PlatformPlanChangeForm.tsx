"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { CompanyDetail } from "@/lib/platform/companies";
import { PLAN_TIERS, type PlanTier } from "@/lib/billing/plans";
import { getPlanDisplayName } from "@/lib/billing/plans";
import { getEffectivePlanId } from "@/lib/billing/plan-limits";
import { updatePlatformCompanySubscription } from "@/lib/platform/client";
import type { SubscriptionStatus } from "@/lib/types";
import { useLocale, useTranslations } from "@/components/providers/LocaleProvider";
import { SettingsButton } from "@/components/settings/SettingsButton";
import { SettingsFeedback } from "@/components/settings/SettingsFeedback";
import { SettingsField } from "@/components/settings/SettingsField";
import { surfaceCard } from "@/lib/ui/surface";
import { cn } from "@/lib/utils/cn";

interface PlatformPlanChangeFormProps {
  company: CompanyDetail;
  onUpdated?: (company: CompanyDetail) => void;
  className?: string;
}

const PAID_STATUSES: SubscriptionStatus[] = ["active", "trialing", "past_due"];
const FREE_STATUSES: SubscriptionStatus[] = ["active", "canceled", "none"];

export function PlatformPlanChangeForm({
  company,
  onUpdated,
  className,
}: PlatformPlanChangeFormProps) {
  const { t } = useTranslations("platform");
  const { locale } = useLocale();

  const effectivePlanId = getEffectivePlanId({
    id: company.id,
    name: company.name,
    ownerId: company.ownerId,
    avgServiceTimeMin: 10,
    toleranceEnabled: false,
    toleranceMin: 5,
    defaultLocale: "pt-BR",
    subscription: company.subscription,
    createdAt: company.createdAt,
  });

  const [planId, setPlanId] = useState<PlanTier>(effectivePlanId);
  const [status, setStatus] = useState<SubscriptionStatus>(
    company.subscription?.status ?? "none",
  );
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    setPlanId(effectivePlanId);
    setStatus(company.subscription?.status ?? "none");
  }, [company, effectivePlanId]);

  const statusOptions = useMemo(
    () => (planId === "free" ? FREE_STATUSES : PAID_STATUSES),
    [planId],
  );

  useEffect(() => {
    if (!statusOptions.includes(status)) {
      setStatus(statusOptions[0]);
    }
  }, [status, statusOptions]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const updated = await updatePlatformCompanySubscription(company.id, {
        planId,
        status,
        reason: reason.trim() || undefined,
      });
      setSuccess(t("changePlan.success"));
      onUpdated?.(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("loadError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className={cn(surfaceCard, "space-y-4 p-4", className)}
    >
      <div>
        <h3 className="text-sm font-semibold text-on-surface">{t("changePlan.title")}</h3>
        <p className="mt-1 text-xs text-on-surface-variant">{t("changePlan.hint")}</p>
      </div>

      <SettingsFeedback error={error} success={success} />

      <SettingsField label={t("colPlan")}>
        <select
          value={planId}
          onChange={(e) => setPlanId(e.target.value as PlanTier)}
          disabled={loading}
          className="w-full rounded-xl border border-outline-variant/60 bg-surface-container px-3 py-2.5 text-sm"
        >
          {PLAN_TIERS.map((tier) => (
            <option key={tier} value={tier}>
              {getPlanDisplayName(tier, locale)}
            </option>
          ))}
        </select>
      </SettingsField>

      <SettingsField label={t("colSubscription")}>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as SubscriptionStatus)}
          disabled={loading}
          className="w-full rounded-xl border border-outline-variant/60 bg-surface-container px-3 py-2.5 text-sm"
        >
          {statusOptions.map((option) => (
            <option key={option} value={option}>
              {t(`status.${option}`)}
            </option>
          ))}
        </select>
      </SettingsField>

      <SettingsField label={t("changePlan.reason")}>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          disabled={loading}
          rows={2}
          className="w-full rounded-xl border border-outline-variant/60 bg-surface-container px-3 py-2.5 text-sm"
          placeholder={t("actions.reasonLabel")}
        />
      </SettingsField>

      <SettingsButton type="submit" variant="primary" size="sm" loading={loading}>
        {t("changePlan.submit")}
      </SettingsButton>
    </form>
  );
}
