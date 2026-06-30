#!/usr/bin/env node
/**
 * Valida configuração Stripe do Waitless.
 * Uso: npm run verify:stripe
 */

import Stripe from "stripe";
import { loadEnvLocal } from "./load-env-local.mjs";
import { STRIPE_PRICE_CATALOG } from "./stripe-plan-catalog.mjs";

loadEnvLocal();

const appUrl =
  process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "") || "http://localhost:3000";
const prodWebhookUrl = appUrl.includes("localhost")
  ? "https://www.waitless.solutions/api/billing/webhook"
  : `${appUrl}/api/billing/webhook`;

function printCliChecklist() {
  console.log(`
--- Webhook local (desenvolvimento) ---
stripe login
stripe listen --forward-to localhost:3000/api/billing/webhook
# Cole o whsec_... em STRIPE_WEBHOOK_SECRET no .env.local e reinicie npm run dev

--- Customer Portal ---
https://dashboard.stripe.com/test/settings/billing/portal
Ative: cancelar assinatura, atualizar cartão, trocar plano

--- Teste de checkout ---
1. npm run dev
2. Conta (Dono) → Essencial mensal → Assinar
3. Cartão: 4242 4242 4242 4242 | validade futura | CVC qualquer

--- Produção (Vercel) ---
1. npm run setup:stripe-prices com sk_live_... (ou crie preços live no Dashboard)
2. Webhook: ${prodWebhookUrl}
   Eventos: checkout.session.completed, customer.subscription.created,
            customer.subscription.updated, customer.subscription.deleted
3. Variáveis STRIPE_* na Vercel (Production) + redeploy
`);
}

async function main() {
  console.log("=== Verificação Stripe — Waitless ===\n");
  console.log("URL base:", appUrl);

  let failures = 0;

  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();

  if (!secretKey) {
    console.log("FAIL STRIPE_SECRET_KEY ausente");
    failures++;
  } else {
    const mode = secretKey.startsWith("sk_live_") ? "live" : "test";
    console.log(`OK   STRIPE_SECRET_KEY (${mode})`);
  }

  if (!webhookSecret) {
    console.log("FAIL STRIPE_WEBHOOK_SECRET ausente (use stripe listen em dev)");
    failures++;
  } else {
    console.log("OK   STRIPE_WEBHOOK_SECRET");
  }

  const missingPrices = STRIPE_PRICE_CATALOG.filter(
    (entry) => !process.env[entry.envKey]?.trim(),
  );

  if (missingPrices.length > 0) {
    console.log(`\nFAIL ${missingPrices.length} Price ID(s) ausente(s):`);
    for (const entry of missingPrices) {
      console.log(`     ${entry.envKey}`);
    }
    console.log("\nRode: npm run setup:stripe-prices");
    failures += missingPrices.length;
  } else {
    console.log(`\nOK   ${STRIPE_PRICE_CATALOG.length} STRIPE_PRICE_* definidos`);
  }

  if (secretKey && missingPrices.length === 0) {
    console.log("\n--- Validação na API Stripe ---");
    const stripe = new Stripe(secretKey);
    for (const entry of STRIPE_PRICE_CATALOG) {
      const priceId = process.env[entry.envKey].trim();
      try {
        const price = await stripe.prices.retrieve(priceId);
        const ok =
          price.active &&
          price.currency === entry.currency &&
          price.unit_amount === entry.amount;
        console.log(`${ok ? "OK" : "WARN"} ${entry.envKey} → ${priceId}`);
        if (!ok) {
          console.log(
            `     esperado: ${entry.currency} ${entry.amount}, ativo=true`,
          );
          failures++;
        }
      } catch (error) {
        console.log(`FAIL ${entry.envKey} → ${priceId} (${error.message})`);
        failures++;
      }
    }
  }

  if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim() &&
      !process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim()) {
    console.log("\nWARN FIREBASE_SERVICE_ACCOUNT_* ausente — checkout/webhook precisam do Admin SDK");
  } else {
    console.log("\nOK   Firebase Admin configurado");
  }

  const brFlags = [
    ["STRIPE_BR_BOLETO_ENABLED", "Boleto (Stripe)"],
    ["STRIPE_BR_INSTALLMENTS_ENABLED", "Parcelamento (Stripe)"],
    ["ASAAS_PIX_ENABLED", "PIX (Asaas server)"],
    ["NEXT_PUBLIC_BILLING_PIX_ENABLED", "PIX (UI)"],
  ];
  console.log("\n--- Métodos BR (opcional) ---");
  for (const [key, label] of brFlags) {
    const on = ["1", "true", "yes"].includes(process.env[key]?.trim().toLowerCase() ?? "");
    console.log(`${on ? "ON " : "off"} ${key} (${label})`);
  }

  printCliChecklist();

  process.exit(failures > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
