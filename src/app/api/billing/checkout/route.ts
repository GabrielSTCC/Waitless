import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import type { BillingInterval, BillingMarket, PaidPlanTier } from "@/lib/billing/plans";
import { getPlanPrice } from "@/lib/billing/plans";
import { buildBrazilCheckoutExtras } from "@/lib/billing/stripe-brazil-checkout";
import { resolveBillingMarketFromCompanyData } from "@/lib/billing/resolve-market";
import { getStripePriceId, isStripeConfigured } from "@/lib/billing/stripe-prices";
import { buildSubscriptionMetadata } from "@/lib/billing/stripe-sync";
import { getAppBaseUrl, getStripe } from "@/lib/billing/stripe-server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { getAdminDb } from "@/lib/firebase/admin";

function parseCheckoutBody(body: unknown): {
  planId: PaidPlanTier;
  interval: BillingInterval;
  clientMarket?: BillingMarket;
} | null {
  if (!body || typeof body !== "object") return null;
  const data = body as Record<string, unknown>;
  const planId = data.planId;
  const interval = data.interval;
  const market = data.market;

  if (planId !== "essential" && planId !== "pro") return null;
  if (interval !== "week" && interval !== "month" && interval !== "year") return null;

  const clientMarket =
    market === "BR" || market === "US" ? (market as BillingMarket) : undefined;

  return { planId, interval, clientMarket };
}

function billingErrorResponse(error: unknown): NextResponse {
  console.error("[billing/checkout]", error);

  if (error instanceof Stripe.errors.StripeError) {
    return NextResponse.json({ error: error.message }, { status: 502 });
  }

  const message =
    error instanceof Error ? error.message : "Não foi possível iniciar o checkout.";
  return NextResponse.json({ error: message }, { status: 500 });
}

export async function POST(request: NextRequest) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Pagamentos ainda não configurados no servidor." },
      { status: 503 },
    );
  }

  const authResult = await authenticateRequest(request);
  if (authResult instanceof Response) return authResult;

  const body = parseCheckoutBody(await request.json().catch(() => null));
  if (!body) {
    return NextResponse.json({ error: "Plano inválido." }, { status: 400 });
  }

  try {
    const db = getAdminDb();
    const memberSnap = await db.doc(`members/${authResult.uid}`).get();
    if (!memberSnap.exists) {
      return NextResponse.json({ error: "Membro não encontrado." }, { status: 403 });
    }

    const companyId = memberSnap.data()?.companyId as string | undefined;
    if (!companyId) {
      return NextResponse.json({ error: "Empresa não vinculada." }, { status: 403 });
    }

    const companySnap = await db.doc(`companies/${companyId}`).get();
    if (!companySnap.exists) {
      return NextResponse.json({ error: "Empresa não encontrada." }, { status: 404 });
    }

    const companyData = companySnap.data()!;
    if (companyData.ownerId !== authResult.uid) {
      return NextResponse.json(
        { error: "Somente o dono pode gerenciar a assinatura." },
        { status: 403 },
      );
    }

    const billingMarket = resolveBillingMarketFromCompanyData({
      billingMarket: companyData.billingMarket as BillingMarket | undefined,
      billingCountry: companyData.billingCountry as "BR" | "US" | undefined,
      legal: companyData.legal as { cnpj?: string } | undefined,
      defaultLocale: companyData.defaultLocale === "en" ? "en" : "pt-BR",
    });

    if (body.clientMarket && body.clientMarket !== billingMarket) {
      console.warn(
        `[billing] Market mismatch for company ${companyId}: client=${body.clientMarket}, server=${billingMarket}`,
      );
      return NextResponse.json(
        {
          error:
            "O mercado de cobrança desta conta não corresponde ao informado. Os preços são definidos pelo país do estabelecimento no cadastro.",
        },
        { status: 403 },
      );
    }

    const planPrice = getPlanPrice(body.planId, billingMarket, body.interval);
    const priceId = getStripePriceId(body.planId, billingMarket, body.interval);
    if (!priceId || !planPrice) {
      return NextResponse.json(
        { error: "Preço Stripe não configurado para este plano." },
        { status: 503 },
      );
    }

    const stripe = getStripe();
    const subscription = companyData.subscription as
      | { stripeCustomerId?: string }
      | undefined;
    let customerId = subscription?.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: authResult.email,
        metadata: { companyId },
      });
      customerId = customer.id;
      await db.doc(`companies/${companyId}`).set(
        { subscription: { stripeCustomerId: customerId } },
        { merge: true },
      );
    }

    const baseUrl = getAppBaseUrl();
    const isBrazil = billingMarket === "BR";
    const metadata = buildSubscriptionMetadata({
      companyId,
      planId: body.planId,
      market: billingMarket,
      interval: body.interval,
    });

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/admin/account?checkout=success`,
      cancel_url: `${baseUrl}/admin/account?checkout=cancel`,
      metadata,
      subscription_data: { metadata },
      billing_address_collection: "required",
      locale: isBrazil ? "pt-BR" : "en",
      allow_promotion_codes: true,
      ...(isBrazil
        ? buildBrazilCheckoutExtras(body.interval, planPrice.amount)
        : {}),
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Não foi possível iniciar o checkout." },
        { status: 500 },
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    return billingErrorResponse(error);
  }
}
