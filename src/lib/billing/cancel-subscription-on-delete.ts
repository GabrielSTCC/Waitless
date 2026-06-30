import { cancelAsaasSubscription } from "@/lib/billing/asaas/client";
import { isStripeConfigured } from "@/lib/billing/stripe-prices";
import { getStripe } from "@/lib/billing/stripe-server";
import type { CompanySubscription } from "@/lib/types";

export async function cancelSubscriptionsOnDelete(
  subscription: CompanySubscription | undefined,
): Promise<void> {
  if (!subscription) return;

  const tasks: Promise<void>[] = [];

  if (subscription.stripeSubscriptionId && isStripeConfigured()) {
    tasks.push(
      (async () => {
        try {
          const stripe = getStripe();
          await stripe.subscriptions.cancel(subscription.stripeSubscriptionId!);
        } catch (error) {
          console.error("[cancel-subscription] Stripe cancel failed:", error);
        }
      })(),
    );
  }

  if (subscription.asaasSubscriptionId && process.env.ASAAS_API_KEY?.trim()) {
    tasks.push(
      (async () => {
        try {
          await cancelAsaasSubscription(subscription.asaasSubscriptionId!);
        } catch (error) {
          console.error("[cancel-subscription] Asaas cancel failed:", error);
        }
      })(),
    );
  }

  await Promise.all(tasks);
}
