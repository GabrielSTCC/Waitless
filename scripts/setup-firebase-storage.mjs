#!/usr/bin/env node
/**
 * One-time Firebase Storage bootstrap:
 * 1. Creates default bucket (requires Blaze plan + IAM permission)
 * 2. Deploys storage.rules
 * 3. Applies CORS from cors.json
 *
 * Usage: node scripts/setup-firebase-storage.mjs
 */

import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectId = "waitless-queue-saas";
const bucket = `${projectId}.firebasestorage.app`;
const corsFile = join(__dirname, "..", "cors.json");
const FIREBASE_CONFIG = join(homedir(), ".config", "configstore", "firebase-tools.json");

function getAccessToken() {
  if (!existsSync(FIREBASE_CONFIG)) {
    throw new Error("Execute: npx firebase-tools@latest login");
  }
  const config = JSON.parse(readFileSync(FIREBASE_CONFIG, "utf8"));
  const token = config.tokens?.access_token;
  const expiresAt = config.tokens?.expires_at ?? 0;
  if (!token || expiresAt <= Date.now()) {
    throw new Error("Token expirado. Execute: npx firebase-tools@latest login --reauth");
  }
  return token;
}

async function api(method, url, body) {
  const token = getAccessToken();
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  return { ok: response.ok, status: response.status, text };
}

async function ensureDefaultBucket() {
  const get = await api(
    "GET",
    `https://firebasestorage.googleapis.com/v1alpha/projects/${projectId}/defaultBucket`,
  );
  if (get.ok) {
    console.log("Default bucket já existe.");
    return;
  }

  console.log("Criando default bucket (requer plano Blaze)...");
  const create = await api(
    "POST",
    `https://firebasestorage.googleapis.com/v1alpha/projects/${projectId}/defaultBucket`,
    { location: "US-CENTRAL1" },
  );

  if (!create.ok) {
    throw new Error(
      `Não foi possível criar o bucket (${create.status}). ` +
        "Habilite o plano Blaze e abra Storage → Get started no console:\n" +
        `https://console.firebase.google.com/project/${projectId}/storage\n` +
        create.text.slice(0, 300),
    );
  }

  console.log("Default bucket criado.");
}

async function applyCors() {
  const cors = JSON.parse(readFileSync(corsFile, "utf8"));
  console.log("Aplicando CORS...");
  const patch = await api(
    "PATCH",
    `https://storage.googleapis.com/storage/v1/b/${bucket}?fields=cors`,
    { cors },
  );
  if (!patch.ok) {
    throw new Error(`Falha ao aplicar CORS (${patch.status}): ${patch.text.slice(0, 300)}`);
  }
  console.log("CORS aplicado.");
}

function deployRules() {
  console.log("Publicando storage.rules...");
  execSync(`npx -y firebase-tools@latest deploy --only storage --project ${projectId}`, {
    stdio: "inherit",
  });
}

try {
  await ensureDefaultBucket();
  deployRules();
  await applyCors();
  console.log("\nFirebase Storage configurado com sucesso.");
} catch (error) {
  console.error(`\n${error instanceof Error ? error.message : error}`);
  process.exit(1);
}
