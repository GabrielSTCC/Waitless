"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CreditCard } from "lucide-react";
import { useLocale, useTranslations } from "@/components/providers/LocaleProvider";
import { SettingsButton } from "@/components/settings/SettingsButton";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { PixCheckoutModal } from "@/components/account/PixCheckoutModal";
import {
  isPixBillingEnabled,
  startCheckoutSession,
  startPixCheckoutSession,
  type PixCheckoutData,
} from "@/lib/billing/client";
import { canChangeBillingCountry } from "@/lib/billing/billing-guard";
import { getEffectivePlanId } from "@/lib/billing/plan-limits";
import { getCompanyBillingMarket } from "@/lib/billing/resolve-market";
import { MonthlyUsageMeter } from "@/components/billing/MonthlyUsageMeter";
import { PlanFeaturesList } from "@/components/billing/PlanFeaturesList";
import {
  ANNUAL_DISCOUNT_PERCENT,
  BILLING_INTERVALS,
  formatPlanPrice,
  getAnnualPricingDetails,
  getPlanPrice,
  PAID_PLAN_TIERS,
  type BillingInterval,
  type PaidPlanTier,
} from "@/lib/billing/plans";
import { getSubscriptionPlanLabel } from "@/lib/subscription";
import {
  getTrialDaysRemaining,
  isSignupTrial,
  isTrialExpired,
} from "@/lib/billing/trial";
import type { Company } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

type PaymentMethod = "card" | "pix";

function parsePlanParam(value: string | null): PaidPlanTier | null {
  return value === "essential" || value === "pro" ? value : null;
}

function parseIntervalParam(value: string | null): BillingInterval | null {
  return value === "week" || value === "month" || value === "year" ? value : null;
}

interface SubscriptionCardProps {
  company: Company;
}

export function SubscriptionCard({ company }: SubscriptionCardProps) {
  const searchParams = useSearchParams();
  const { t } = useTranslations("account");
  const { t: tb } = useTranslations("billing");
  const { t: tc } = useTranslations("common");
  const { locale } = useLocale();
  const market = getCompanyBillingMarket(company);
  const pixAvailable = market === "BR" && isPixBillingEnabled();
  const [interval, setInterval] = useState<BillingInterval>(
    () => parseIntervalParam(searchParams.get("interval")) ?? "month",
  );
  const [selectedTier, setSelectedTier] = useState<PaidPlanTier>(
    () => parsePlanParam(searchParams.get("plan")) ?? "essential",
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    pixAvailable ? "pix" : "card",
  );
  const [cpfCnpj, setCpfCnpj] = useState(company.legal?.cnpj ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pixModalOpen, setPixModalOpen] = useState(false);
  const [pixData, setPixData] = useState<PixCheckoutData | null>(null);

  const planLabel = getSubscriptionPlanLabel(company, locale);
  const effectivePlanId = getEffectivePlanId(company);
  const currentPeriodEnd = company.subscription?.currentPeriodEnd;
  const billingInterval = company.subscription?.billingInterval;
  const billingLocked = !canChangeBillingCountry(company);
  const showCnpjHint = market === "BR" && !company.legal?.cnpj && paymentMethod !== "pix";
  const trialEndsAt = company.subscription?.trialEndsAt;
  const showTrialInfo = isSignupTrial(company) || isTrialExpired(company);
  const trialExpired = isTrialExpired(company);
  const trialDaysRemaining = getTrialDaysRemaining(company);

  const selectedPrice = useMemo(
    () => getPlanPrice(selectedTier, market, interval),
    [selectedTier, market, interval],
  );

  async function handleCheckout() {
    setError("");
    setLoading(true);
    try {
      if (paymentMethod === "pix" && pixAvailable) {
        const pix = await startPixCheckoutSession({
          planId: selectedTier,
          interval,
          cpfCnpj: cpfCnpj.trim() || undefined,
        });
        setPixData(pix);
        setPixModalOpen(true);
      } else {
        await startCheckoutSession({
          planId: selectedTier,
          interval,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : tb("checkoutError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <SettingsSection
        title={t("subscriptionTitle")}
        description={t("subscriptionDescription")}
        info={t("info.subscription")}
        infoLabel={tc("infoMore")}
        icon={CreditCard}
        compact
        className="h-full"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-on-surface-variant">{t("currentPlan")}</span>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
            {planLabel}
          </span>
          <span className="rounded-full border border-outline-variant px-3 py-1 text-xs font-medium text-on-surface-variant">
            {market === "BR" ? tb("billingMarketBadgeBR") : tb("billingMarketBadgeUS")}
          </span>
        </div>

        {currentPeriodEnd && (
          <p className="text-xs text-on-surface-variant">
            {t("renewsAt", {
              date: currentPeriodEnd.toLocaleDateString(locale),
              interval: billingInterval ? tb(`interval.${billingInterval}`) : "",
            })}
          </p>
        )}

        {showTrialInfo && trialEndsAt && (
          <p
            className={cn(
              "text-xs",
              trialExpired ? "font-medium text-error" : "text-on-surface-variant",
            )}
          >
            {trialExpired
              ? t("trialExpired")
              : `${t("trialEndsAt", { date: trialEndsAt.toLocaleDateString(locale) })} · ${t("trialDaysRemaining", { days: String(trialDaysRemaining) })}`}
          </p>
        )}

        {billingLocked && (
          <p className="text-xs text-on-surface-variant">{tb("billingCountryLocked")}</p>
        )}

        {showCnpjHint && (
          <p className="text-xs text-on-surface-variant">{tb("cnpjOptionalHint")}</p>
        )}

        <MonthlyUsageMeter company={company} className="mt-3" />

        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium text-on-surface">{tb("currentPlanFeatures")}</p>
          <PlanFeaturesList planId={effectivePlanId} compact />
        </div>

        <div className="mt-4 space-y-3">
          <p className="text-sm font-medium text-on-surface">{tb("choosePlan")}</p>

          {pixAvailable && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-on-surface-variant">{tb("paymentMethod")}</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("pix")}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                    paymentMethod === "pix"
                      ? "bg-primary text-on-primary"
                      : "bg-surface-container text-on-surface-variant hover:text-on-surface",
                  )}
                >
                  {tb("paymentMethodPix")}
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("card")}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                    paymentMethod === "card"
                      ? "bg-primary text-on-primary"
                      : "bg-surface-container text-on-surface-variant hover:text-on-surface",
                  )}
                >
                  {tb("paymentMethodCard")}
                </button>
              </div>
              {paymentMethod === "pix" && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-on-surface" htmlFor="pix-cpf-cnpj">
                    {tb("pix.cpfCnpjLabel")}
                  </label>
                  <input
                    id="pix-cpf-cnpj"
                    type="text"
                    inputMode="numeric"
                    value={cpfCnpj}
                    onChange={(event) => setCpfCnpj(event.target.value)}
                    placeholder={tb("pix.cpfCnpjPlaceholder")}
                    className="w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm text-on-surface"
                  />
                  <p className="text-[11px] text-on-surface-variant">{tb("pix.cpfCnpjHint")}</p>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {BILLING_INTERVALS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setInterval(value)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  interval === value
                    ? "bg-primary text-on-primary"
                    : "bg-surface-container text-on-surface-variant hover:text-on-surface",
                )}
              >
                {tb(`interval.${value}`)}
                {value === "year" && (
                  <span
                    className={cn(
                      "rounded-full px-1 py-0.5 text-[9px] font-bold leading-none",
                      interval === "year"
                        ? "bg-on-primary/20 text-on-primary"
                        : "bg-primary/15 text-primary",
                    )}
                  >
                    {tb("annualDiscountBadge", { percent: String(ANNUAL_DISCOUNT_PERCENT) })}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {PAID_PLAN_TIERS.map((tier) => {
              const price = getPlanPrice(tier, market, interval);
              const annualDetails =
                interval === "year" ? getAnnualPricingDetails(tier, market) : null;
              const active = selectedTier === tier;
              return (
                <button
                  key={tier}
                  type="button"
                  onClick={() => setSelectedTier(tier)}
                  className={cn(
                    "rounded-xl border px-3 py-3 text-left transition-colors",
                    active
                      ? "border-primary bg-primary/5"
                      : "border-outline-variant hover:border-primary/30",
                  )}
                >
                  <p className="text-sm font-medium text-on-surface">{tb(`plans.${tier}.name`)}</p>
                  <p className="mt-1 text-lg font-semibold text-primary">
                    {price ? formatPlanPrice(price, locale) : "—"}
                  </p>
                  <p className="text-xs text-on-surface-variant">{tb(`per.${interval}`)}</p>
                  {annualDetails && price && (
                    <>
                      <p className="text-[10px] text-on-surface-variant line-through">
                        {formatPlanPrice(
                          {
                            amount: annualDetails.fullYearWithoutDiscount,
                            currency: price.currency,
                          },
                          locale,
                        )}
                      </p>
                      <p className="text-[10px] font-medium text-primary">
                        {tb("annualSave", {
                          amount: formatPlanPrice(
                            { amount: annualDetails.savings, currency: price.currency },
                            locale,
                          ),
                        })}
                      </p>
                    </>
                  )}
                </button>
              );
            })}
          </div>

          {selectedPrice && (
            <p className="text-xs text-on-surface-variant">
              {paymentMethod === "pix"
                ? tb("pix.billingNote")
                : interval === "week"
                  ? tb("weeklyNote")
                  : interval === "year"
                    ? tb("annualNote", { percent: String(ANNUAL_DISCOUNT_PERCENT) })
                    : tb("billingNote")}
            </p>
          )}

          {selectedTier !== effectivePlanId && (
            <div className="rounded-xl border border-outline-variant/60 bg-surface-container-low/50 p-3">
              <p className="mb-2 text-xs font-medium text-on-surface">
                {tb("selectedPlanFeatures", { plan: tb(`plans.${selectedTier}.name`) })}
              </p>
              <PlanFeaturesList planId={selectedTier} compact />
            </div>
          )}
        </div>

        {error && (
          <p className="rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
            {error}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <SettingsButton
            type="button"
            variant="primary"
            size="sm"
            loading={loading}
            onClick={() => void handleCheckout()}
          >
            {trialExpired
              ? t("upgradeSoon")
              : paymentMethod === "pix"
                ? tb("pix.subscribeCta")
                : t("upgradeSoon")}
          </SettingsButton>
        </div>
      </SettingsSection>

      <PixCheckoutModal
        open={pixModalOpen}
        pix={pixData}
        onClose={() => setPixModalOpen(false)}
      />
    </>
  );
}
