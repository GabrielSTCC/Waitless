#!/usr/bin/env node
/**
 * Backfill billingTransactions a partir do Stripe e Asaas.
 *
 * Uso:
 *   node scripts/backfill-billing-transactions.mjs
 *   node scripts/backfill-billing-transactions.mjs --companyId=SLUG
 *
 * Requer FIREBASE_SERVICE_ACCOUNT_JSON, STRIPE_SECRET_KEY (opcional), ASAAS_API_KEY (opcional).
 */

import { existsSync, readFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvLocal } from "./load-env-local.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

loadEnvLocal();

function loadServiceAccount() {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (json) return JSON.parse(json.trim());
  const pathEnv =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH ?? "secrets/firebase-service-account.json";
  const absolute = resolve(root, pathEnv);
  if (!existsSync(absolute)) {
    console.error("Conta de serviço não encontrada.");
    process.exit(1);
  }
  return JSON.parse(readFileSync(absolute, "utf8"));
}

function parseArgs() {
  const companyId = process.argv
    .slice(2)
    .find((arg) => arg.startsWith("--companyId="))
    ?.split("=")[1]
    ?.trim();
  return { companyId };
}

async function backfillStripe(db, stripe, companyId, companyName, customerId, planId) {
  let startingAfter;
  let count = 0;

  while (true) {
    const page = await stripe.invoices.list({
      customer: customerId,
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });

    for (const invoice of page.data) {
      const { Timestamp, FieldValue } = await import("firebase-admin/firestore");
      const amountMinor =
        invoice.status === "paid"
          ? invoice.amount_paid
          : invoice.amount_due ?? invoice.total ?? 0;
      const paidAt = invoice.status_transitions?.paid_at;
      const occurredAt = paidAt
        ? new Date(paidAt * 1000)
        : new Date((invoice.created ?? Date.now() / 1000) * 1000);
      const currency = (invoice.currency?.toUpperCase() ?? "USD");

      let status = "pending";
      switch (invoice.status) {
        case "paid":
          status = "paid";
          break;
        case "open":
        case "draft":
          status = "pending";
          break;
        case "uncollectible":
        case "void":
          status = "failed";
          break;
        default:
          status = "canceled";
      }

      const docId = `stripe:${invoice.id}`;
      await db.collection("billingTransactions").doc(docId).set(
        {
          provider: "stripe",
          externalId: invoice.id,
          companyId,
          companyName,
          amountMinor,
          currency,
          status,
          rawStatus: invoice.status ?? "unknown",
          billingType: "subscription",
          planId: planId ?? invoice.metadata?.planId ?? null,
          description:
            invoice.description ??
            invoice.lines?.data?.[0]?.description ??
            `Stripe invoice ${invoice.number ?? invoice.id}`,
          occurredAt: Timestamp.fromDate(occurredAt),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      count++;
    }

    if (!page.has_more || page.data.length === 0) break;
    startingAfter = page.data[page.data.length - 1].id;
  }

  return count;
}

async function backfillAsaas(db, subscriptionId, companyId, companyName, planId) {
  const base = process.env.ASAAS_SANDBOX === "true"
    ? "https://sandbox.asaas.com/api/v3"
    : "https://api.asaas.com/api/v3";
  const apiKey = process.env.ASAAS_API_KEY?.trim();
  if (!apiKey) return 0;

  const response = await fetch(`${base}/subscriptions/${subscriptionId}/payments`, {
    headers: { accept: "application/json", access_token: apiKey },
  });
  if (!response.ok) {
    console.warn(`[asaas] falha ao listar pagamentos ${subscriptionId}: HTTP ${response.status}`);
    return 0;
  }

  const body = await response.json();
  const payments = body.data ?? [];
  const { Timestamp, FieldValue } = await import("firebase-admin/firestore");
  let count = 0;

  for (const payment of payments) {
    const paymentId = payment.id;
    const statusRaw = payment.status;
    let status = "pending";
    if (statusRaw === "RECEIVED" || statusRaw === "CONFIRMED") status = "paid";
    else if (statusRaw === "OVERDUE") status = "failed";
    else if (
      statusRaw === "REFUNDED" ||
      statusRaw === "REFUND_REQUESTED" ||
      statusRaw === "CHARGEBACK_REQUESTED" ||
      statusRaw === "CHARGEBACK_DISPUTE"
    ) {
      status = "refunded";
    } else if (statusRaw === "DELETED") status = "canceled";

    const dueDate = payment.dueDate;
    const occurredAt = dueDate ? new Date(`${dueDate}T12:00:00`) : new Date();
    const billingType = payment.billingType === "PIX" ? "pix" : "subscription";

    const docId = `asaas:${paymentId}`;
    await db.collection("billingTransactions").doc(docId).set(
      {
        provider: "asaas",
        externalId: paymentId,
        companyId,
        companyName,
        amountMinor: Math.round(Number(payment.value) * 100),
        currency: "BRL",
        status,
        rawStatus: statusRaw,
        billingType,
        planId: planId ?? null,
        description: `Asaas ${payment.billingType} · ${dueDate}`,
        occurredAt: Timestamp.fromDate(occurredAt),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    count++;
  }

  return count;
}

async function main() {
  const { companyId: filterCompanyId } = parseArgs();

  const { initializeApp, cert, getApps } = await import("firebase-admin/app");
  const { getFirestore } = await import("firebase-admin/firestore");

  if (getApps().length === 0) {
    const serviceAccount = loadServiceAccount();
    initializeApp({
      credential: cert(serviceAccount),
      projectId:
        serviceAccount.project_id ??
        process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ??
        "waitless-queue-saas",
    });
  }

  const db = getFirestore();
  let stripe = null;
  const stripeKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (stripeKey) {
    const Stripe = (await import("stripe")).default;
    stripe = new Stripe(stripeKey);
  }

  let query = db.collection("companies");
  if (filterCompanyId) {
    const snap = await db.doc(`companies/${filterCompanyId}`).get();
    if (!snap.exists) {
      console.error(`Empresa não encontrada: ${filterCompanyId}`);
      process.exit(1);
    }
    query = { get: async () => ({ docs: [snap], empty: false }) };
  }

  const snap = await query.get();
  let stripeCount = 0;
  let asaasCount = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    const subscription = data.subscription ?? {};
    const companyName = data.name ?? doc.id;
    const planId = subscription.planId;

    if (stripe && subscription.stripeCustomerId) {
      process.stdout.write(`Stripe: ${doc.id} (${subscription.stripeCustomerId})… `);
      const count = await backfillStripe(
        db,
        stripe,
        doc.id,
        companyName,
        subscription.stripeCustomerId,
        planId,
      );
      stripeCount += count;
      console.log(`${count} invoice(s)`);
    }

    if (subscription.asaasSubscriptionId) {
      process.stdout.write(`Asaas: ${doc.id} (${subscription.asaasSubscriptionId})… `);
      const count = await backfillAsaas(
        db,
        subscription.asaasSubscriptionId,
        doc.id,
        companyName,
        planId,
      );
      asaasCount += count;
      console.log(`${count} payment(s)`);
    }
  }

  console.log(`\nConcluído. Stripe: ${stripeCount}, Asaas: ${asaasCount}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
