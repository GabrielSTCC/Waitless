import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvLocal } from "../load-env-local.mjs";
import { CONTEXT_PATH, LOCAL_DIR, ROOT } from "./constants.mjs";

loadEnvLocal();

export function ensureLocalDir() {
  mkdirSync(LOCAL_DIR, { recursive: true });
}

export function writeContext(data) {
  ensureLocalDir();
  writeFileSync(CONTEXT_PATH, `${JSON.stringify(data, null, 2)}\n`);
}

export function readContext() {
  if (!existsSync(CONTEXT_PATH)) {
    throw new Error(
      `Contexto ausente em ${CONTEXT_PATH}. Rode: node scripts/load/seed.mjs`,
    );
  }
  return JSON.parse(readFileSync(CONTEXT_PATH, "utf8"));
}

export function loadServiceAccount() {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (json) {
    return JSON.parse(json.trim());
  }
  const pathEnv =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH ?? "secrets/firebase-service-account.json";
  const absolute = resolve(ROOT, pathEnv);
  if (!existsSync(absolute)) {
    throw new Error(
      "Conta de serviço Firebase não encontrada. Defina FIREBASE_SERVICE_ACCOUNT_JSON ou FIREBASE_SERVICE_ACCOUNT_PATH.",
    );
  }
  return JSON.parse(readFileSync(absolute, "utf8"));
}

let adminApp = null;

export async function getFirebaseAdmin() {
  if (adminApp) return adminApp;
  const { initializeApp, cert, getApps } = await import("firebase-admin/app");
  const { getAuth } = await import("firebase-admin/auth");
  const { getFirestore } = await import("firebase-admin/firestore");

  const serviceAccount = loadServiceAccount();
  if (getApps().length === 0) {
    initializeApp({
      credential: cert(serviceAccount),
      projectId:
        serviceAccount.project_id ??
        process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ??
        "waitless-queue-saas",
    });
  }
  adminApp = {
    auth: getAuth(),
    db: getFirestore(),
  };
  return adminApp;
}

export function requireFirebaseWebConfig() {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim();
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();
  if (!apiKey || !projectId) {
    throw new Error(
      "Defina NEXT_PUBLIC_FIREBASE_API_KEY e NEXT_PUBLIC_FIREBASE_PROJECT_ID (via .env.local ou secrets).",
    );
  }
  return { apiKey, projectId };
}
