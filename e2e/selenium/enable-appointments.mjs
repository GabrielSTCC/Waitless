#!/usr/bin/env node
/**
 * Liga agendamento na Barbearia Atlas para a suíte Selenium
 * poder abrir /agendar e ver horários. Não altera o seed.
 */
import { existsSync, readFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function loadEnvLocal() {
  const envPath = join(root, ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq);
    let value = trimmed.slice(eq + 1);
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

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

function openDay(closed) {
  return { closed, start: "09:00", end: "18:00" };
}

loadEnvLocal();
const serviceAccount = loadServiceAccount();
const { initializeApp, cert, getApps } = await import("firebase-admin/app");
const { getFirestore } = await import("firebase-admin/firestore");

if (getApps().length === 0) {
  initializeApp({
    credential: cert(serviceAccount),
    projectId: serviceAccount.project_id ?? "waitless-queue-saas",
  });
}

const db = getFirestore();
await db.doc("companies/barbearia-atlas").set(
  {
    appointmentsEnabled: true,
    serviceMode: "single",
    reminderLeadMin: 60,
    businessHours: {
      sun: openDay(true),
      mon: openDay(false),
      tue: openDay(false),
      wed: openDay(false),
      thu: openDay(false),
      fri: openDay(false),
      sat: openDay(false),
    },
  },
  { merge: true },
);
console.log("Agendamento ligado em companies/barbearia-atlas");
