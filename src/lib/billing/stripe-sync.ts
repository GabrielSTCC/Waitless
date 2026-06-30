import { Timestamp } from "firebase-admin/firestore";
import type Stripe from "stripe";
import type { BillingInterval, BillingMarket, PaidPlanTier } from "@/lib/billing/plans";
import { resolveBillingMarketFromCompanyData } from "@/lib/billing/resolve-market";
import { resolvePlanFromStripePriceId } from "@/lib/billing/stripe-prices";
import type { SubscriptionStatus } from "@/lib/types";
import type { Firestore } from "firebase-admin/firestore";

function mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case "active":
      return "active";
    case "trialing":
      return "trialing";
    case "past_due":
      return "past_due";
    case "canceled":
    case "unpaid":
    case "incomplete_expired":
      return "canceled";
    default:
      return "none";
  }
}

function extractPeriodEnd(subscription: Stripe.Subscription): number | undefined {
  const item = subscription.items.data[0];
  return item?.current_period_end;
}

function extractPriceId(subscription: Stripe.Subscription): string | undefined {
  const item = subscription.items.data[0];
  const price = item?.price;
  return typeof price === "string" ? price : price?.id;
}

export async function syncCompanySubscriptionFromStripe(
  db: Firestore,
  companyId: string,
  subscription: Stripe.Subscription,
): Promise<void> {
  const priceId = extractPriceId(subscription);
  const resolved = priceId ? resolvePlanFromStripePriceId(priceId) : null;
  const status = mapStripeStatus(subscription.status);
  const isPaidActive =
    status === "active" || status === "trialing" || status === "past_due";

  const periodEnd = extractPeriodEnd(subscription);

  const payload: Record<string, unknown> = {
    status,
    stripeSubscriptionId: subscription.id,
    ...(periodEnd
      ? { currentPeriodEnd: Timestamp.fromMillis(periodEnd * 1000) }
      : {}),
  };

  if (isPaidActive && resolved) {
    const companySnap = await db.doc(`companies/${companyId}`).get();
    const companyData = companySnap.data();
    const expectedMarket = companyData
      ? resolveBillingMarketFromCompanyData({
          billingMarket: companyData.billingMarket as BillingMarket | undefined,
          billingCountry: companyData.billingCountry as "BR" | "US" | undefined,
          legal: companyData.legal as { cnpj?: string } | undefined,
          defaultLocale: companyData.defaultLocale === "en" ? "en" : "pt-BR",
        })
      : resolved.market;

    if (resolved.market !== expectedMarket) {
      console.error(
        `[billing] Webhook market mismatch for company ${companyId}: expected ${expectedMarket}, got ${resolved.market} (price ${priceId})`,
      );
      return;
    }

    payload.planId = resolved.planId;
    payload.billingInterval = resolved.interval;
    payload.billingMarket = resolved.market;
    payload.paymentProvider = "stripe";
  } else if (status === "canceled" || status === "none") {
    payload.planId = "free";
    payload.billingInterval = null;
    payload.billingMarket = null;
    payload.stripeSubscriptionId = null;
    payload.currentPeriodEnd = null;
  }

  await db.doc(`companies/${companyId}`).set(
    { subscription: payload },
    { merge: true },
  );
}

export async function findCompanyIdByStripeCustomerId(
  db: Firestore,
  customerId: string,
): Promise<string | null> {
  const snap = await db
    .collection("companies")
    .where("subscription.stripeCustomerId", "==", customerId)
    .limit(1)
    .get();

  if (snap.empty) return null;
  return snap.docs[0].id;
}

export async function findCompanyIdByStripeSubscriptionId(
  db: Firestore,
  subscriptionId: string,
): Promise<string | null> {
  const snap = await db
    .collection("companies")
    .where("subscription.stripeSubscriptionId", "==", subscriptionId)
    .limit(1)
    .get();

  if (snap.empty) return null;
  return snap.docs[0].id;
}

export function buildSubscriptionMetadata(input: {
  companyId: string;
  planId: PaidPlanTier;
  market: BillingMarket;
  interval: BillingInterval;
}) {
  return {
    companyId: input.companyId,
    planId: input.planId,
    billingMarket: input.market,
    billingInterval: input.interval,
  };
}
