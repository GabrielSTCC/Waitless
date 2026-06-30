export const PLAN_TIERS = ["free", "essential", "pro"] as const;
export type PlanTier = (typeof PLAN_TIERS)[number];

export const PAID_PLAN_TIERS = ["essential", "pro"] as const;
export type PaidPlanTier = (typeof PAID_PLAN_TIERS)[number];

export const BILLING_INTERVALS = ["week", "month", "year"] as const;
export type BillingInterval = (typeof BILLING_INTERVALS)[number];

export const BILLING_MARKETS = ["BR", "US"] as const;
export type BillingMarket = (typeof BILLING_MARKETS)[number];

/** Desconto do plano anual em relação a 12× o mensal (ex.: 18 = economize 18%). */
export const ANNUAL_DISCOUNT_PERCENT = 18;

export type WhiteLabelLevel = "basic" | "logo" | "full";
export type AnalyticsLevel = "none" | "basic" | "full";

export interface PlanLimits {
  monthlyCompletions: number | null;
  fairUseCompletions: number | null;
  maxStaff: number | null;
  whiteLabel: WhiteLabelLevel;
  analytics: AnalyticsLevel;
  toleranceFeatures: boolean;
  whatsappApi: boolean;
}

export interface PlanPrice {
  amount: number;
  currency: "BRL" | "USD";
}

export interface PlanDefinition {
  id: PlanTier;
  limits: PlanLimits;
  prices: Record<BillingMarket, Partial<Record<BillingInterval, PlanPrice>>>;
}

export const PLAN_DEFINITIONS: Record<PlanTier, PlanDefinition> = {
  free: {
    id: "free",
    limits: {
      monthlyCompletions: 80,
      fairUseCompletions: null,
      maxStaff: 2,
      whiteLabel: "basic",
      analytics: "none",
      toleranceFeatures: false,
      whatsappApi: false,
    },
    prices: { BR: {}, US: {} },
  },
  essential: {
    id: "essential",
    limits: {
      monthlyCompletions: 600,
      fairUseCompletions: null,
      maxStaff: 5,
      whiteLabel: "logo",
      analytics: "basic",
      toleranceFeatures: false,
      whatsappApi: false,
    },
    prices: {
      BR: {
        week: { amount: 32, currency: "BRL" },
        month: { amount: 79, currency: "BRL" },
        year: { amount: 777, currency: "BRL" },
      },
      US: {
        week: { amount: 12, currency: "USD" },
        month: { amount: 39, currency: "USD" },
        year: { amount: 384, currency: "USD" },
      },
    },
  },
  pro: {
    id: "pro",
    limits: {
      monthlyCompletions: null,
      fairUseCompletions: 3000,
      maxStaff: null,
      whiteLabel: "full",
      analytics: "full",
      toleranceFeatures: true,
      whatsappApi: true,
    },
    prices: {
      BR: {
        week: { amount: 57, currency: "BRL" },
        month: { amount: 139, currency: "BRL" },
        year: { amount: 1368, currency: "BRL" },
      },
      US: {
        week: { amount: 22, currency: "USD" },
        month: { amount: 69, currency: "USD" },
        year: { amount: 679, currency: "USD" },
      },
    },
  },
};

export function isPlanTier(value: string | undefined): value is PlanTier {
  return PLAN_TIERS.includes(value as PlanTier);
}

export function isPaidPlanTier(value: string | undefined): value is PaidPlanTier {
  return PAID_PLAN_TIERS.includes(value as PaidPlanTier);
}

export function getPlanDefinition(planId: string | undefined): PlanDefinition {
  if (isPlanTier(planId)) return PLAN_DEFINITIONS[planId];
  return PLAN_DEFINITIONS.free;
}

export function getPlanLimits(planId: string | undefined): PlanLimits {
  return getPlanDefinition(planId).limits;
}

export function getPlanPrice(
  tier: PaidPlanTier,
  market: BillingMarket,
  interval: BillingInterval,
): PlanPrice | undefined {
  return PLAN_DEFINITIONS[tier].prices[market][interval];
}

export function formatPlanPrice(price: PlanPrice, locale: "pt-BR" | "en"): string {
  const localeTag = locale === "pt-BR" ? "pt-BR" : "en-US";
  return new Intl.NumberFormat(localeTag, {
    style: "currency",
    currency: price.currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price.amount);
}

export function getPlanDisplayName(
  planId: string | undefined,
  locale: "pt-BR" | "en",
): string {
  const id = isPlanTier(planId) ? planId : "free";
  const names: Record<PlanTier, Record<"pt-BR" | "en", string>> = {
    free: { "pt-BR": "Gratuito", en: "Free" },
    essential: { "pt-BR": "Essencial", en: "Essential" },
    pro: { "pt-BR": "Pro", en: "Pro" },
  };
  return names[id][locale];
}

export function getPlanDisplayNameForCompany(
  company: { subscription?: { planId?: string; trialEndsAt?: Date } } | null | undefined,
  locale: "pt-BR" | "en",
): string {
  const planId = company?.subscription?.planId;
  const trialEndsAt = company?.subscription?.trialEndsAt;
  if (planId === "free" && trialEndsAt) {
    return locale === "pt-BR" ? "Teste" : "Trial";
  }
  return getPlanDisplayName(planId, locale);
}

export function resolveBillingMarketFromLocale(locale: "pt-BR" | "en"): BillingMarket {
  return locale === "pt-BR" ? "BR" : "US";
}

export function getIntervalLabel(
  interval: BillingInterval,
  locale: "pt-BR" | "en",
): string {
  const labels: Record<BillingInterval, Record<"pt-BR" | "en", string>> = {
    week: { "pt-BR": "semana", en: "week" },
    month: { "pt-BR": "mês", en: "month" },
    year: { "pt-BR": "ano", en: "year" },
  };
  return labels[interval][locale];
}

export function getMonthlyEquivalent(
  tier: PaidPlanTier,
  market: BillingMarket,
  interval: BillingInterval,
): number | undefined {
  const price = getPlanPrice(tier, market, interval);
  if (!price) return undefined;
  if (interval === "month") return price.amount;
  if (interval === "year") return Math.round(price.amount / 12);
  if (interval === "week") return Math.round((price.amount * 52) / 12);
  return undefined;
}

export interface AnnualPricingDetails {
  annual: PlanPrice;
  monthly: PlanPrice;
  fullYearWithoutDiscount: number;
  savings: number;
  discountPercent: number;
  monthlyEquivalent: number;
}

export function getAnnualPricingDetails(
  tier: PaidPlanTier,
  market: BillingMarket,
): AnnualPricingDetails | null {
  const monthly = getPlanPrice(tier, market, "month");
  const annual = getPlanPrice(tier, market, "year");
  if (!monthly || !annual) return null;

  const fullYearWithoutDiscount = monthly.amount * 12;
  const savings = fullYearWithoutDiscount - annual.amount;
  const discountPercent = Math.round((savings / fullYearWithoutDiscount) * 100);

  return {
    annual,
    monthly,
    fullYearWithoutDiscount,
    savings,
    discountPercent,
    monthlyEquivalent: Math.round(annual.amount / 12),
  };
}
