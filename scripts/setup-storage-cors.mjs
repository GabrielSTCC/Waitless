#!/usr/bin/env node
/**
 * Applies CORS on the Firebase Storage bucket for local dev and Firebase Hosting.
 * Tries gcloud/gsutil first, then Firebase CLI access token via Storage API.
 *
 * Usage: node scripts/setup-storage-cors.mjs
 */

import { execSync, spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectId = "waitless-queue-saas";
const bucket = `${projectId}.firebasestorage.app`;
const corsFile = join(__dirname, "..", "cors.json");
const FIREBASE_CONFIG = join(homedir(), ".config", "configstore", "firebase-tools.json");

function hasCommand(name) {
  const result = spawnSync(name, ["--version"], { shell: true, stdio: "ignore" });
  return result.status === 0;
}

function collectEnvOrigins() {
  const origins = [];
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "");
  if (appUrl) origins.push(appUrl);

  const vercelUrl = process.env.VERCEL_URL?.trim().replace(/\/+$/, "");
  if (vercelUrl) {
    origins.push(vercelUrl.startsWith("http") ? vercelUrl : `https://${vercelUrl}`);
  }

  return origins;
}

function mergeEnvOrigins(cors) {
  const extra = collectEnvOrigins();
  if (extra.length === 0) return cors;

  return cors.map((rule) => ({
    ...rule,
    origin: [...new Set([...rule.origin, ...extra])],
  }));
}

function loadCorsConfig() {
  console.log(`Bucket alvo: gs://${bucket}`);
  console.log(`Arquivo CORS: ${corsFile}`);
  const base = JSON.parse(readFileSync(corsFile, "utf8"));
  const merged = mergeEnvOrigins(base);
  const extra = collectEnvOrigins();
  if (extra.length > 0) {
    console.log(`Origens extras (env): ${extra.join(", ")}`);
  }
  return merged;
}

function tryGcloud() {
  const gcloudPaths = [
    join(homedir(), "AppData", "Local", "Google", "Cloud SDK", "google-cloud-sdk", "bin", "gcloud.cmd"),
    "gcloud",
  ];

  for (const gcloud of gcloudPaths) {
    const exists = gcloud === "gcloud" ? hasCommand("gcloud") : existsSync(gcloud);
    if (!exists) continue;

    const auth = spawnSync(gcloud, ["auth", "list", "--filter=status:ACTIVE", "--format=value(account)"], {
      shell: true,
      encoding: "utf8",
    });
    if (!auth.stdout?.trim()) continue;

    try {
      console.log("\nAplicando CORS via gcloud...");
      execSync(
        `"${gcloud}" storage buckets update gs://${bucket} --cors-file="${corsFile}" --project=${projectId}`,
        { stdio: "inherit", shell: true },
      );
      return true;
    } catch {
      console.warn("gcloud falhou; tentando Firebase CLI...");
    }
  }

  if (hasCommand("gsutil")) {
    const auth = spawnSync("gsutil", ["version"], { shell: true, stdio: "ignore" });
    if (auth.status === 0) {
      try {
        console.log("\nAplicando CORS via gsutil...");
        execSync(`gsutil cors set "${corsFile}" gs://${bucket}`, { stdio: "inherit", shell: true });
        return true;
      } catch {
        console.warn("gsutil falhou (credenciais ausentes); tentando Firebase CLI...");
      }
    }
  }

  return false;
}

function getFirebaseAccessToken() {
  if (!existsSync(FIREBASE_CONFIG)) {
    throw new Error("Firebase CLI não autenticado. Execute: npx firebase-tools@latest login");
  }

  const config = JSON.parse(readFileSync(FIREBASE_CONFIG, "utf8"));
  const token = config.tokens?.access_token;
  const expiresAt = config.tokens?.expires_at ?? 0;

  if (!token || expiresAt <= Date.now()) {
    throw new Error("Token expirado. Execute: npx firebase-tools@latest login --reauth");
  }

  return token;
}

async function applyCorsViaApi(cors) {
  console.log("\nAplicando CORS via Firebase CLI credentials...");
  const accessToken = getFirebaseAccessToken();

  const response = await fetch(
    `https://storage.googleapis.com/storage/v1/b/${bucket}?fields=cors`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ cors }),
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`API Storage retornou ${response.status}: ${body.slice(0, 400)}`);
  }

  console.log("CORS aplicado com sucesso.");
}

const cors = loadCorsConfig();

try {
  if (tryGcloud()) {
    process.exit(0);
  }

  await applyCorsViaApi(cors);
} catch (error) {
  console.error(`\nErro: ${error instanceof Error ? error.message : error}`);
  console.log(`
Pré-requisito: habilitar Storage no console (plano Blaze):
https://console.firebase.google.com/project/${projectId}/storage

Depois execute o setup completo:
  npm run setup:firebase-storage
`);
  process.exit(1);
}
