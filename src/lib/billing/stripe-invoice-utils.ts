import type Stripe from "stripe";

/** Extrai subscription ID de Invoice (compatível com versões recentes da API Stripe). */
export function getStripeInvoiceSubscriptionId(invoice: Stripe.Invoice): string | undefined {
  const extended = invoice as Stripe.Invoice & {
    subscription?: string | { id?: string } | null;
  };

  if (typeof extended.subscription === "string") return extended.subscription;
  if (extended.subscription && typeof extended.subscription === "object") {
    return extended.subscription.id;
  }

  const parentSubscription = invoice.parent?.subscription_details?.subscription;
  if (typeof parentSubscription === "string") return parentSubscription;

  return undefined;
}

/** Extrai customer ID de Invoice. */
export function getStripeInvoiceCustomerId(invoice: Stripe.Invoice): string | undefined {
  if (typeof invoice.customer === "string") return invoice.customer;
  return invoice.customer?.id;
}

/** Extrai charge ID de Charge (compatível com invoice expandido ou string). */
export function getStripeChargeInvoiceId(charge: Stripe.Charge): string | undefined {
  const invoice = (charge as Stripe.Charge & { invoice?: string | { id?: string } | null })
    .invoice;
  if (typeof invoice === "string") return invoice;
  return invoice?.id;
}
