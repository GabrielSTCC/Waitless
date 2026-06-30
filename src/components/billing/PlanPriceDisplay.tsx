"use client";

import {
  formatPlanPrice,
  getAnnualPricingDetails,
  getPlanPrice,
  type BillingInterval,
  type BillingMarket,
  type PaidPlanTier,
} from "@/lib/billing/plans";
import { useTranslations } from "@/components/providers/LocaleProvider";
import { cn } from "@/lib/utils/cn";

interface PlanPriceDisplayProps {
  tier: PaidPlanTier;
  market: BillingMarket;
  interval: BillingInterval;
  locale: "pt-BR" | "en";
  priceClassName?: string;
  compact?: boolean;
}

export function PlanPriceDisplay({
  tier,
  market,
  interval,
  locale,
  priceClassName = "font-heading text-3xl font-bold text-on-surface",
  compact = false,
}: PlanPriceDisplayProps) {
  const { t } = useTranslations("pricing");
  const price = getPlanPrice(tier, market, interval);
  const annualDetails =
    interval === "year" ? getAnnualPricingDetails(tier, market) : null;

  if (!price) {
    return <p className={priceClassName}>—</p>;
  }

  if (!annualDetails) {
    return (
      <div>
        <p className={priceClassName}>{formatPlanPrice(price, locale)}</p>
        <p className="text-xs text-on-surface-variant">{t(`per.${interval}`)}</p>
      </div>
    );
  }

  const savingsFormatted = formatPlanPrice(
    { amount: annualDetails.savings, currency: price.currency },
    locale,
  );
  const fullYearFormatted = formatPlanPrice(
    { amount: annualDetails.fullYearWithoutDiscount, currency: price.currency },
    locale,
  );
  const monthlyEqFormatted = formatPlanPrice(
    { amount: annualDetails.monthlyEquivalent, currency: price.currency },
    locale,
  );

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <p className={priceClassName}>{formatPlanPrice(price, locale)}</p>
        <span
          className={cn(
            "rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary",
            compact && "text-[10px]",
          )}
        >
          {t("annualDiscountBadge", { percent: String(annualDetails.discountPercent) })}
        </span>
      </div>
      <p className="text-xs text-on-surface-variant">{t("per.year")}</p>
      <p className="text-xs text-on-surface-variant line-through">{fullYearFormatted}</p>
      <p className="text-xs font-medium text-primary">
        {t("annualSave", { amount: savingsFormatted })}
      </p>
      <p className="text-xs text-on-surface-variant">
        {t("monthlyEquivalent", { price: monthlyEqFormatted })}
      </p>
    </div>
  );
}
