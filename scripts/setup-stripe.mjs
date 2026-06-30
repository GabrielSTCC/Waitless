#!/usr/bin/env node
/**
 * Guia de ativação Stripe no Waitless (CLI, portal, produção).
 * Uso: npm run setup:stripe
 */

import { loadEnvLocal } from "./load-env-local.mjs";

loadEnvLocal();

const hasKey = Boolean(process.env.STRIPE_SECRET_KEY?.trim());
const appUrl =
  process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "") || "http://localhost:3000";

console.log(`=== Guia Stripe — Waitless ===

Estado atual:
- STRIPE_SECRET_KEY: ${hasKey ? "definida" : "AUSENTE — adicione em .env.local"}
- NEXT_PUBLIC_APP_URL: ${appUrl}

--- 1. Criar preços automaticamente ---
npm run setup:stripe-prices
(Cria 2 produtos + 12 preços e grava STRIPE_PRICE_* em .env.local)

--- 2. Webhook local ---
Instale: https://docs.stripe.com/stripe-cli
  stripe login
  stripe listen --forward-to localhost:3000/api/billing/webhook
Cole o whsec_... em STRIPE_WEBHOOK_SECRET no .env.local

--- 3. Customer Portal (Dashboard) ---
https://dashboard.stripe.com/test/settings/billing/portal
Habilite cancelamento, troca de plano e atualização de pagamento.

--- 4. Brasil ---
Cartão / boleto / parcelamento (Stripe):
  Settings → Payment methods: https://dashboard.stripe.com/settings/payment_methods
  STRIPE_BR_BOLETO_ENABLED=true
  STRIPE_BR_INSTALLMENTS_ENABLED=true

PIX (Asaas — assinaturas recorrentes):
  https://www.asaas.com → Integrações → API Key
  Webhook: {APP_URL}/api/billing/pix/webhook
  Env: ASAAS_API_KEY, ASAAS_WEBHOOK_TOKEN, NEXT_PUBLIC_BILLING_PIX_ENABLED=true

--- 5. Verificar ---
npm run verify:stripe
npm run dev

--- 6. Produção (Vercel) ---
- Repita setup:stripe-prices com sk_live_... OU crie preços live manualmente
- Webhook: https://www.waitless.solutions/api/billing/webhook
- Env vars na Vercel: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, 12× STRIPE_PRICE_*
- Redeploy
`);
