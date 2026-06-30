#!/usr/bin/env node
/**
 * Valida alinhamento entre service account local e NEXT_PUBLIC_FIREBASE_PROJECT_ID.
 * Uso: node scripts/verify-firebase-env.mjs [.env-file]
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const envFile = process.argv[2] ?? ".env.local";
const keyPath = resolve("secrets/firebase-service-account.json");

if (!existsSync(keyPath)) {
  console.error(`Service account não encontrada: ${keyPath}`);
  process.exit(1);
}

const serviceAccount = JSON.parse(readFileSync(keyPath, "utf8"));
const serviceProjectId = serviceAccount.project_id;

let publicProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

if (existsSync(envFile)) {
  const envContent = readFileSync(envFile, "utf8");
  const match = envContent.match(/^NEXT_PUBLIC_FIREBASE_PROJECT_ID=(.*)$/m);
  if (match) {
    publicProjectId = match[1].replace(/^["']|["']$/g, "").trim();
  }
}

console.log(`Service account project_id: ${serviceProjectId}`);
console.log(`NEXT_PUBLIC_FIREBASE_PROJECT_ID: ${publicProjectId || "(não definido)"}`);

if (!publicProjectId) {
  console.warn("WARN: NEXT_PUBLIC_FIREBASE_PROJECT_ID ausente — fallback waitless-queue-saas no servidor.");
  process.exit(0);
}

if (serviceProjectId !== publicProjectId) {
  console.error(
    `FAIL: projectId divergente (service account="${serviceProjectId}" vs env="${publicProjectId}")`,
  );
  process.exit(1);
}

console.log("OK: projectId alinhado.");
