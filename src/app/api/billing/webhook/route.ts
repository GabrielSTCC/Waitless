import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import {
  findCompanyIdByStripeCustomerId,
  findCompanyIdByStripeSubscriptionId,
  syncCompanySubscriptionFromStripe,
} from "@/lib/billing/stripe-sync";
import { recordStripeInvoice, upsertBillingTransaction, resolveCompanyFromStripeInvoice, mapStripeInvoiceToTransaction } from "@/lib/billing/transaction-ledger";
import { getStripe } from "@/lib/billing/stripe-server";
import {
  getStripeChargeInvoiceId,
  getStripeInvoiceSubscriptionId,
} from "@/lib/billing/stripe-invoice-utils";
import { getAdminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";

async function resolveCompanyId(
  db: ReturnType<typeof getAdminDb>,
  subscription: Stripe.Subscription,
): Promise<string | null> {
  const metadataCompanyId = subscription.metadata?.companyId;
  if (metadataCompanyId) return metadataCompanyId;

  const bySubscription = await findCompanyIdByStripeSubscriptionId(db, subscription.id);
  if (bySubscription) return bySubscription;

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id;

  if (!customerId) return null;
  return findCompanyIdByStripeCustomerId(db, customerId);
}

async function handleStripeInvoiceEvent(
  db: ReturnType<typeof getAdminDb>,
  stripe: Stripe,
  invoice: Stripe.Invoice,
): Promise<void> {
  await recordStripeInvoice(db, invoice);

  const subscriptionId = getStripeInvoiceSubscriptionId(invoice);

  if (!subscriptionId) return;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const companyId = await resolveCompanyId(db, subscription);
  if (!companyId) return;

  await syncCompanySubscriptionFromStripe(db, companyId, subscription);
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook não configurado." }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Assinatura ausente." }, { status: 400 });
  }

  const stripe = getStripe();
  const db = getAdminDb();
  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Assinatura inválida." }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription") break;

        const companyId = session.metadata?.companyId;
        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id;

        if (!companyId || !subscriptionId) break;

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        await syncCompanySubscriptionFromStripe(db, companyId, subscription);
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const companyId = await resolveCompanyId(db, subscription);
        if (!companyId) break;
        await syncCompanySubscriptionFromStripe(db, companyId, subscription);
        break;
      }

      case "invoice.paid":
      case "invoice.payment_failed":
      case "invoice.finalized": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleStripeInvoiceEvent(db, stripe, invoice);
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const invoiceId = getStripeChargeInvoiceId(charge);
        if (!invoiceId) break;
        const invoice = await stripe.invoices.retrieve(invoiceId);
        const company = await resolveCompanyFromStripeInvoice(db, invoice);
        if (!company) break;
        const input = mapStripeInvoiceToTransaction(invoice, company, company.planId);
        input.status = "refunded";
        input.rawStatus = "refunded";
        await upsertBillingTransaction(db, input);
        break;
      }

      default:
        break;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha no webhook.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
