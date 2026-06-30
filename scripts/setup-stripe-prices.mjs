#!/usr/bin/env node
/**
 * Cria produtos e os 12 preços recorrentes no Stripe (modo test ou live conforme a chave).
 * Grava os Price IDs em .env.local.
 *
 * Pré-requisito: STRIPE_SECRET_KEY em .env.local (sk_test_... ou sk_live_...)
 * Uso: npm run setup:stripe-prices
 */

import Stripe from "stripe";
import { loadEnvLocal, upsertEnvLocal } from "./load-env-local.mjs";
import {
  STRIPE_PRICE_CATALOG,
  STRIPE_PRODUCTS,
  stripeInterval,
} from "./stripe-plan-catalog.mjs";

loadEnvLocal();

const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
if (!secretKey) {
  console.error("Defina STRIPE_SECRET_KEY em .env.local antes de rodar este script.");
  console.error("Obtenha em: https://dashboard.stripe.com/test/apikeys");
  process.exit(1);
}

const stripe = new Stripe(secretKey);
const mode = secretKey.startsWith("sk_live_") ? "live" : "test";

async function findOrCreateProduct(tier, name) {
  const existing = await stripe.products.search({
    query: `metadata['waitless_tier']:'${tier}'`,
    limit: 1,
  });

  if (existing.data[0]) {
    console.log(`  Produto existente: ${existing.data[0].name} (${existing.data[0].id})`);
    return existing.data[0];
  }

  const product = await stripe.products.create({
    name,
    metadata: { waitless_tier: tier, waitless_app: "waitless" },
  });
  console.log(`  Produto criado: ${product.name} (${product.id})`);
  return product;
}

async function findOrCreatePrice(productId, entry) {
  const existingId = process.env[entry.envKey]?.trim();
  if (existingId) {
    try {
      const price = await stripe.prices.retrieve(existingId);
      if (price.active && price.product === productId) {
        console.log(`  OK (env) ${entry.envKey} = ${existingId}`);
        return existingId;
      }
    } catch {
      console.warn(`  Aviso: ${entry.envKey} inválido no .env.local — recriando.`);
    }
  }

  const prices = await stripe.prices.list({
    product: productId,
    active: true,
    limit: 100,
  });

  const match = prices.data.find(
    (p) =>
      p.currency === entry.currency &&
      p.unit_amount === entry.amount &&
      p.recurring?.interval === stripeInterval(entry.interval).interval &&
      (p.recurring?.interval_count ?? 1) === stripeInterval(entry.interval).interval_count,
  );

  if (match) {
    console.log(`  Preço existente: ${entry.envKey} = ${match.id}`);
    upsertEnvLocal(entry.envKey, match.id);
    return match.id;
  }

  const { interval, interval_count } = stripeInterval(entry.interval);
  const price = await stripe.prices.create({
    product: productId,
    currency: entry.currency,
    unit_amount: entry.amount,
    recurring: { interval, interval_count },
    metadata: {
      waitless_tier: entry.tier,
      waitless_market: entry.market,
      waitless_interval: entry.interval,
    },
  });

  console.log(`  Preço criado: ${entry.envKey} = ${price.id}`);
  upsertEnvLocal(entry.envKey, price.id);
  return price.id;
}

async function main() {
  console.log(`=== Setup Stripe — Waitless (${mode}) ===\n`);

  const productByTier = {};
  for (const { tier, name } of STRIPE_PRODUCTS) {
    console.log(`\n${name}:`);
    productByTier[tier] = await findOrCreateProduct(tier, name);
  }

  console.log("\nPreços:");
  for (const entry of STRIPE_PRICE_CATALOG) {
    const product = productByTier[entry.tier];
    await findOrCreatePrice(product.id, entry);
  }

  if (!process.env.NEXT_PUBLIC_APP_URL?.trim()) {
    upsertEnvLocal("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
    console.log("\nNEXT_PUBLIC_APP_URL definido como http://localhost:3000");
  }

  console.log(`
Próximos passos:
1. Webhook local: stripe listen --forward-to localhost:3000/api/billing/webhook
2. Cole o whsec_... em STRIPE_WEBHOOK_SECRET no .env.local
3. npm run verify:stripe
4. npm run dev → Conta → Assinar (cartão teste 4242 4242 4242 4242)

Customer Portal: https://dashboard.stripe.com/${mode === "test" ? "test/" : ""}settings/billing/portal
Payment methods (BR): habilite Boleto e parcelamento em Settings → Payment methods
`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
