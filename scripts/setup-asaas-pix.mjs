#!/usr/bin/env node
/**
 * Garante chave Pix (EVP) na conta Asaas para receber cobranças.
 * Uso: npm run setup:asaas-pix
 */

import { loadEnvLocal } from "./load-env-local.mjs";

loadEnvLocal();

const key = process.env.ASAAS_API_KEY?.trim();
if (!key) {
  console.error("ASAAS_API_KEY ausente em .env.local");
  process.exit(1);
}

const sandbox = ["1", "true", "yes"].includes(
  process.env.ASAAS_SANDBOX?.trim().toLowerCase() ?? "",
);
const base = sandbox ? "https://api-sandbox.asaas.com/v3" : "https://api.asaas.com/v3";

async function asaas(path, init) {
  const response = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      access_token: key,
      ...(init?.headers ?? {}),
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
  console.log(`=== Asaas Pix — ${sandbox ? "SANDBOX" : "PRODUÇÃO"} ===\n`);

  const list = await asaas("/pix/addressKeys");
  const active = (list.data ?? []).filter((item) => item.status !== "DELETED");
  if (active.length > 0) {
    console.log(`OK   ${active.length} chave(s) Pix já cadastrada(s).`);
    for (const item of active) {
      console.log(`     - ${item.type} (${item.status}) id=${item.id}`);
    }
    return;
  }

  console.log("Criando chave Pix aleatória (EVP)...");
  const created = await asaas("/pix/addressKeys", {
    method: "POST",
    body: JSON.stringify({ type: "EVP" }),
  });
  console.log(`OK   Chave criada: ${created.id} (${created.type}, ${created.status})`);
  console.log("\nAgora teste: Admin → Conta → PIX → Gerar PIX");
}

main().catch((error) => {
  console.error("FAIL", error.message);
  process.exit(1);
});
