#!/usr/bin/env node
/**
 * Valida configuração Asaas PIX do Waitless.
 * Uso: npm run verify:asaas
 */

import { loadEnvLocal } from "./load-env-local.mjs";

loadEnvLocal();

const appUrl =
  process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "") || "http://localhost:3000";
const isLocalDev = /localhost|127\.0\.0\.1/.test(appUrl);
const webhookUrl = isLocalDev
  ? "https://www.waitless.solutions/api/billing/pix/webhook"
  : `${appUrl}/api/billing/pix/webhook`;

function isTruthy(value) {
  return ["1", "true", "yes"].includes((value ?? "").trim().toLowerCase());
}

function isFalsy(value) {
  return ["0", "false", "no"].includes((value ?? "").trim().toLowerCase());
}

function printChecklist(sandbox) {
  console.log(`
--- Checklist Asaas PIX ---
1) Chave API: ${sandbox ? "sandbox.asaas.com" : "www.asaas.com"} → Integrações → API
2) Webhook: ${webhookUrl}
   Header: asaas-access-token = valor de ASAAS_WEBHOOK_TOKEN
   Eventos: PAYMENT_RECEIVED, PAYMENT_CONFIRMED, PAYMENT_OVERDUE,
            PAYMENT_REFUNDED, PAYMENT_DELETED
3) Chave Pix: npm run setup:asaas-pix  (ou Asaas → Pix → Minhas chaves)
4) Flags:
   ASAAS_SANDBOX=${sandbox ? "true" : "false (produção)"}
   NEXT_PUBLIC_BILLING_PIX_ENABLED=true  (UI; redeploy após alterar)
5) Teste: Conta (Dono) → plano pago → PIX → Gerar PIX
   Sandbox: use "Simular pagamento" no modal
`);
}

async function asaas(base, key, path) {
  const response = await fetch(`${base}${path}`, {
    headers: {
      accept: "application/json",
      access_token: key,
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errors = body.errors;
    const detail = Array.isArray(errors)
      ? errors[0]?.description
      : body.message ?? JSON.stringify(body);
    throw new Error(detail || `HTTP ${response.status}`);
  }
  return body;
}

async function main() {
  console.log("=== Verificação Asaas PIX — Waitless ===\n");
  console.log("URL base:", appUrl);

  let failures = 0;
  let warnings = 0;

  const apiKey = process.env.ASAAS_API_KEY?.trim();
  const webhookToken = process.env.ASAAS_WEBHOOK_TOKEN?.trim();
  const sandboxFlag = isTruthy(process.env.ASAAS_SANDBOX);
  const looksSandboxKey = Boolean(apiKey?.includes("hmlg") || apiKey?.startsWith("$aact_hmlg_"));

  if (!apiKey) {
    console.log("FAIL ASAAS_API_KEY ausente");
    failures++;
  } else {
    console.log(`OK   ASAAS_API_KEY (${apiKey.slice(0, 12)}…)`);
  }

  if (!webhookToken) {
    console.log("FAIL ASAAS_WEBHOOK_TOKEN ausente — webhook PIX retorna 503");
    failures++;
  } else {
    console.log("OK   ASAAS_WEBHOOK_TOKEN");
  }

  if (apiKey) {
    if (looksSandboxKey && !sandboxFlag) {
      console.log(
        "FAIL Chave parece sandbox ($aact_hmlg_) mas ASAAS_SANDBOX não está true — use ASAAS_SANDBOX=true",
      );
      failures++;
    } else if (!looksSandboxKey && sandboxFlag) {
      console.log(
        "FAIL ASAAS_SANDBOX=true com chave que não parece sandbox — use chave de sandbox.asaas.com ou desligue o flag",
      );
      failures++;
    } else {
      console.log(`OK   Modo ${sandboxFlag ? "SANDBOX" : "PRODUÇÃO"} alinhado à chave`);
    }
  }

  if (isFalsy(process.env.ASAAS_PIX_ENABLED)) {
    console.log("FAIL ASAAS_PIX_ENABLED=false — API PIX desligada no servidor");
    failures++;
  } else {
    console.log("OK   ASAAS_PIX_ENABLED (servidor)");
  }

  if (process.env.NEXT_PUBLIC_BILLING_PIX_ENABLED?.trim() !== "true") {
    console.log(
      "WARN NEXT_PUBLIC_BILLING_PIX_ENABLED≠true — botão PIX oculto na UI (defina true e redeploy)",
    );
    warnings++;
  } else {
    console.log("OK   NEXT_PUBLIC_BILLING_PIX_ENABLED=true");
  }

  if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim() &&
      !process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim()) {
    console.log("WARN FIREBASE_SERVICE_ACCOUNT_* ausente — checkout/webhook precisam do Admin SDK");
    warnings++;
  } else {
    console.log("OK   Firebase Admin configurado");
  }

  if (apiKey) {
    const modeAligned =
      !(looksSandboxKey && !sandboxFlag) && !(!looksSandboxKey && sandboxFlag);
    if (modeAligned) {
      const base = sandboxFlag
        ? "https://api-sandbox.asaas.com/v3"
        : "https://api.asaas.com/v3";
      console.log(`\n--- API Asaas (${sandboxFlag ? "sandbox" : "produção"}) ---`);
      try {
        const account = await asaas(base, apiKey, "/myAccount");
        const name = account.name ?? account.companyName ?? account.email ?? "ok";
        console.log(`OK   /myAccount → ${name}`);
      } catch (error) {
        console.log(`FAIL /myAccount (${error.message})`);
        failures++;
      }

      try {
        const keys = await asaas(base, apiKey, "/pix/addressKeys");
        const active = (keys.data ?? []).filter((item) => item.status !== "DELETED");
        if (active.length === 0) {
          console.log("FAIL Nenhuma chave Pix ativa — rode: npm run setup:asaas-pix");
          failures++;
        } else {
          console.log(`OK   ${active.length} chave(s) Pix ativa(s)`);
          for (const item of active.slice(0, 3)) {
            console.log(`     - ${item.type} (${item.status}) id=${item.id}`);
          }
        }
      } catch (error) {
        console.log(`FAIL /pix/addressKeys (${error.message})`);
        failures++;
      }
    }
  }

  printChecklist(sandboxFlag || looksSandboxKey);

  if (warnings > 0) {
    console.log(`\n${warnings} aviso(s).`);
  }
  process.exit(failures > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
