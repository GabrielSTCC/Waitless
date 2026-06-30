"use client";

import { useMemo, useState } from "react";
import { Check } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useTranslations, useLocale } from "@/components/providers/LocaleProvider";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";
import {
  ANNUAL_DISCOUNT_PERCENT,
  BILLING_INTERVALS,
  getPlanPrice,
  PAID_PLAN_TIERS,
  resolveBillingMarketFromLocale,
  type BillingInterval,
  type PaidPlanTier,
} from "@/lib/billing/plans";
import { PlanPriceDisplay } from "@/components/billing/PlanPriceDisplay";
import {
  FREE_PLAN_FEATURE_KEYS,
  PAID_PLAN_FEATURE_KEYS,
} from "@/lib/billing/plan-features";
import {
  landingContainer,
  landingSectionWarm,
  landingSectionIntro,
} from "@/components/landing/landing-layout";
import { surfaceCard } from "@/lib/ui/surface";
import { cn } from "@/lib/utils/cn";

export function LandingPricing() {
  const { t } = useTranslations("pricing");
  const { locale } = useLocale();
  const reducedMotion = useReducedMotion();
  const market = resolveBillingMarketFromLocale(locale);
  const [interval, setInterval] = useState<BillingInterval>("month");

  const paidTiers = useMemo(
    () =>
      PAID_PLAN_TIERS.map((tier) => {
        const price = getPlanPrice(tier, market, interval);
        return {
          tier,
          price,
          label: t(`plans.${tier}.name`),
          description: t(`plans.${tier}.description`),
          features: PAID_PLAN_FEATURE_KEYS[tier].map((key) => t(key)),
          highlighted: tier === "essential",
        };
      }),
    [interval, market, t],
  );

  return (
    <section className={cn("relative py-16 sm:py-20", landingSectionWarm)}>
      <div className={landingContainer}>
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className={landingSectionIntro}
        >
          <h2 className="font-heading text-3xl font-bold tracking-tight text-on-surface sm:text-4xl">
            {t("title")}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-on-surface-variant sm:text-lg">
            {t("subtitle")}
          </p>
        </motion.div>

        <div className="mt-8 flex flex-wrap justify-center gap-2 md:justify-start">
          {BILLING_INTERVALS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setInterval(value)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors",
                interval === value
                  ? "bg-primary text-on-primary"
                  : "bg-surface-container text-on-surface-variant hover:text-on-surface",
              )}
            >
              {t(`interval.${value}`)}
              {value === "year" && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none",
                    interval === "year"
                      ? "bg-on-primary/20 text-on-primary"
                      : "bg-primary/15 text-primary",
                  )}
                >
                  {t("annualDiscountBadge", { percent: String(ANNUAL_DISCOUNT_PERCENT) })}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-3 lg:gap-6">
          <article className={cn(surfaceCard, "flex flex-col p-6 sm:p-7")}>
            <p className="text-sm font-medium text-primary">{t("plans.free.name")}</p>
            <p className="mt-2 font-heading text-3xl font-bold text-on-surface">
              {t("plans.free.price")}
            </p>
            <p className="mt-2 text-sm text-on-surface-variant">{t("plans.free.description")}</p>
            <ul className="mt-6 flex flex-1 flex-col gap-2.5 text-sm text-on-surface-variant">
              {FREE_PLAN_FEATURE_KEYS.map((key) => (
                <li key={key} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={2} />
                  <span>{t(key)}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/admin/signup"
              className="mt-6 inline-flex items-center justify-center rounded-xl border border-outline-variant px-4 py-2.5 text-sm font-medium text-on-surface transition-colors hover:bg-surface-container-high"
            >
              {t("ctaFree")}
            </Link>
          </article>

          {paidTiers.map(({ tier, label, description, features, highlighted }, index) => (
            <motion.article
              key={tier}
              initial={reducedMotion ? false : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.45, delay: index * 0.08 }}
              className={cn(
                surfaceCard,
                "relative flex flex-col p-6 sm:p-7",
                highlighted && "border-primary/40 bg-gradient-to-br from-primary-container/35 to-surface-container",
              )}
            >
              {highlighted && (
                <span className="absolute right-4 top-4 rounded-full bg-primary px-2.5 py-1 text-xs font-medium text-on-primary">
                  {t("recommended")}
                </span>
              )}
              <p className="text-sm font-medium text-primary">{label}</p>
              <div className="mt-2">
                <PlanPriceDisplay
                  tier={tier}
                  market={market}
                  interval={interval}
                  locale={locale}
                />
              </div>
              <p className="mt-2 text-sm text-on-surface-variant">{description}</p>
              <ul className="mt-6 flex flex-1 flex-col gap-2.5 text-sm text-on-surface-variant">
                {features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={2} />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/admin/signup"
                className={cn(
                  "mt-6 inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium transition-colors",
                  highlighted
                    ? "bg-primary text-on-primary hover:bg-primary/90"
                    : "border border-outline-variant text-on-surface hover:bg-surface-container-high",
                )}
              >
                {t("ctaPaid")}
              </Link>
            </motion.article>
          ))}
        </div>

        <p className="mt-6 text-center text-xs text-on-surface-variant md:text-left">
          {t("footnote")}
        </p>
      </div>
    </section>
  );
}
