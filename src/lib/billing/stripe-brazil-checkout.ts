import type Stripe from "stripe";
import type { BillingInterval } from "@/lib/billing/plans";

function isEnvEnabled(name: string): boolean {
  const value = process.env[name]?.trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes";
}

/**
 * Extras opcionais do Checkout Stripe para mercado BR (cartão, boleto, parcelamento).
 * PIX é processado via Asaas — veja /api/billing/pix/*.
 */
export function buildBrazilCheckoutExtras(
  _interval: BillingInterval,
  _priceAmountBrl: number,
): Pick<Stripe.Checkout.SessionCreateParams, "payment_method_types" | "payment_method_options"> {
  const boletoEnabled = isEnvEnabled("STRIPE_BR_BOLETO_ENABLED");
  const installmentsEnabled = isEnvEnabled("STRIPE_BR_INSTALLMENTS_ENABLED");

  if (!boletoEnabled && !installmentsEnabled) {
    return {};
  }

  const paymentMethodTypes: Stripe.Checkout.SessionCreateParams.PaymentMethodType[] = [
    "card",
  ];
  const paymentMethodOptions: Stripe.Checkout.SessionCreateParams.PaymentMethodOptions =
    {};

  if (boletoEnabled) {
    paymentMethodTypes.push("boleto");
  }

  if (installmentsEnabled) {
    paymentMethodOptions.card = {
      installments: {
        enabled: true,
      },
    };
  }

  return {
    payment_method_types: paymentMethodTypes,
    ...(Object.keys(paymentMethodOptions).length > 0
      ? { payment_method_options: paymentMethodOptions }
      : {}),
  };
}
