/**
 * Catálogo de preços Waitless — espelha src/lib/billing/plans.ts (Essencial/Pro).
 * Valores em unidade menor (centavos / centavos BRL).
 */

export const STRIPE_PRICE_CATALOG = [
  { envKey: "STRIPE_PRICE_BR_ESSENTIAL_WEEK", tier: "essential", market: "BR", interval: "week", amount: 3200, currency: "brl" },
  { envKey: "STRIPE_PRICE_BR_ESSENTIAL_MONTH", tier: "essential", market: "BR", interval: "month", amount: 7900, currency: "brl" },
  { envKey: "STRIPE_PRICE_BR_ESSENTIAL_YEAR", tier: "essential", market: "BR", interval: "year", amount: 77700, currency: "brl" },
  { envKey: "STRIPE_PRICE_US_ESSENTIAL_WEEK", tier: "essential", market: "US", interval: "week", amount: 1200, currency: "usd" },
  { envKey: "STRIPE_PRICE_US_ESSENTIAL_MONTH", tier: "essential", market: "US", interval: "month", amount: 3900, currency: "usd" },
  { envKey: "STRIPE_PRICE_US_ESSENTIAL_YEAR", tier: "essential", market: "US", interval: "year", amount: 38400, currency: "usd" },
  { envKey: "STRIPE_PRICE_BR_PRO_WEEK", tier: "pro", market: "BR", interval: "week", amount: 5700, currency: "brl" },
  { envKey: "STRIPE_PRICE_BR_PRO_MONTH", tier: "pro", market: "BR", interval: "month", amount: 13900, currency: "brl" },
  { envKey: "STRIPE_PRICE_BR_PRO_YEAR", tier: "pro", market: "BR", interval: "year", amount: 136800, currency: "brl" },
  { envKey: "STRIPE_PRICE_US_PRO_WEEK", tier: "pro", market: "US", interval: "week", amount: 2200, currency: "usd" },
  { envKey: "STRIPE_PRICE_US_PRO_MONTH", tier: "pro", market: "US", interval: "month", amount: 6900, currency: "usd" },
  { envKey: "STRIPE_PRICE_US_PRO_YEAR", tier: "pro", market: "US", interval: "year", amount: 67900, currency: "usd" },
];

export const STRIPE_PRODUCTS = [
  { tier: "essential", name: "Waitless Essencial" },
  { tier: "pro", name: "Waitless Pro" },
];

export function stripeInterval(interval) {
  if (interval === "week") return { interval: "week", interval_count: 1 };
  if (interval === "month") return { interval: "month", interval_count: 1 };
  return { interval: "year", interval_count: 1 };
}
