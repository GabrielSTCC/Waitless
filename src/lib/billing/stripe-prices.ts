import type { BillingInterval, BillingMarket, PaidPlanTier } from "@/lib/billing/plans";

function envKey(
  market: BillingMarket,
  tier: PaidPlanTier,
  interval: BillingInterval,
): string {
  return `STRIPE_PRICE_${market}_${tier.toUpperCase()}_${interval.toUpperCase()}`;
}

export function getStripePriceId(
  tier: PaidPlanTier,
  market: BillingMarket,
  interval: BillingInterval,
): string | undefined {
  const value = process.env[envKey(market, tier, interval)]?.trim();
  return value || undefined;
}

export function resolvePlanFromStripePriceId(priceId: string): {
  planId: PaidPlanTier;
  market: BillingMarket;
  interval: BillingInterval;
} | null {
  const tiers: PaidPlanTier[] = ["essential", "pro"];
  const markets: BillingMarket[] = ["BR", "US"];
  const intervals: BillingInterval[] = ["week", "month", "year"];

  for (const tier of tiers) {
    for (const market of markets) {
      for (const interval of intervals) {
        const envPriceId = getStripePriceId(tier, market, interval);
        if (envPriceId && envPriceId === priceId) {
          return { planId: tier, market, interval };
        }
      }
    }
  }

  return null;
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}
