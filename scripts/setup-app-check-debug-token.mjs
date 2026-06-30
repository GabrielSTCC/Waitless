#!/usr/bin/env node
/**
 * Registra um App Check debug token no Firebase e grava em .env.local.
 * Necessário para testes E2E (TestSprite/Playwright) com App Check ativo.
 *
 * Uso: npm run setup:app-check-debug-token
 */

import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { JWT } from "google-auth-library";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const envLocal = join(root, ".env.local");
const DEBUG_TOKEN_ENV = "NEXT_PUBLIC_FIREBASE_APP_CHECK_DEBUG_TOKEN";
const DISPLAY_NAME = "TestSprite E2E";

function loadServiceAccount() {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (json) return JSON.parse(json.trim());
  const pathEnv =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH ?? "secrets/firebase-service-account.json";
  const absolute = resolve(root, pathEnv);
  if (!existsSync(absolute)) {
    console.error("Conta de serviço não encontrada. Rode npm run setup:service-account.");
    process.exit(1);
  }
  return JSON.parse(readFileSync(absolute, "utf8"));
}

function readEnvValue(key) {
  if (!existsSync(envLocal)) return "";
  const content = readFileSync(envLocal, "utf8");
  return content.match(new RegExp(`^${key}=(.*)$`, "m"))?.[1]?.trim() ?? "";
}

function upsertEnvLine(content, key, value) {
  const line = `${key}=${value}`;
  const regex = new RegExp(`^${key}=.*$`, "m");
  if (regex.test(content)) return content.replace(regex, line);
  const trimmed = content.trimEnd();
  return trimmed ? `${trimmed}\n${line}\n` : `${line}\n`;
}

function projectNumberFromAppId(appId) {
  const parts = appId.split(":");
  if (parts.length < 2 || !parts[1]) {
    throw new Error(`NEXT_PUBLIC_FIREBASE_APP_ID inválido: ${appId}`);
  }
  return parts[1];
}

async function registerDebugToken(serviceAccount, projectNumber, appId, token) {
  const client = new JWT({
    email: serviceAccount.client_email,
    key: serviceAccount.private_key,
    scopes: ["https://www.googleapis.com/auth.firebase"],
  });

  const accessToken = await client.getAccessToken();
  if (!accessToken.token) {
    throw new Error("Falha ao obter access token da conta de serviço.");
  }

  const parent = `projects/${projectNumber}/apps/${encodeURIComponent(appId)}`;
  const url = `https://firebaseappcheck.googleapis.com/v1/${parent}/debugTokens`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      displayName: DISPLAY_NAME,
      token,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`App Check API ${response.status}: ${body}`);
  }

  return response.json();
}

async function main() {
  const appId = readEnvValue("NEXT_PUBLIC_FIREBASE_APP_ID");
  if (!appId) {
    console.error("Defina NEXT_PUBLIC_FIREBASE_APP_ID em .env.local");
    process.exit(1);
  }

  const existing = readEnvValue(DEBUG_TOKEN_ENV);
  const token = existing || randomUUID();
  const projectNumber = projectNumberFromAppId(appId);
  const serviceAccount = loadServiceAccount();

  console.log("Waitless — App Check debug token para E2E\n");

  if (existing) {
    console.log(`Token existente em .env.local — registrando novamente: ${existing}`);
  } else {
    console.log(`Novo token gerado: ${token}`);
  }

  await registerDebugToken(serviceAccount, projectNumber, appId, token);

  let envContent = existsSync(envLocal) ? readFileSync(envLocal, "utf8") : "";
  envContent = upsertEnvLine(envContent, DEBUG_TOKEN_ENV, token);
  writeFileSync(envLocal, envContent, "utf8");

  console.log(`Registrado no Firebase App Check (${DISPLAY_NAME})`);
  console.log(`Atualizado .env.local → ${DEBUG_TOKEN_ENV}`);
  console.log("\nRecompile e reinicie o servidor antes dos testes:");
  console.log("  npm run build && npm run start");
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
