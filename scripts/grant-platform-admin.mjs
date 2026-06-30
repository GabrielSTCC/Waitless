#!/usr/bin/env node
/**
 * Concede custom claim platformAdmin a um usuário Firebase Auth.
 *
 * Uso:
 *   node scripts/grant-platform-admin.mjs usuario@email.com
 *   node scripts/grant-platform-admin.mjs --uid FIREBASE_UID
 *
 * Requer FIREBASE_SERVICE_ACCOUNT_PATH ou FIREBASE_SERVICE_ACCOUNT_JSON.
 */

import { existsSync, readFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function loadServiceAccount() {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (json) {
    return JSON.parse(json.trim());
  }
  const pathEnv =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH ?? "secrets/firebase-service-account.json";
  const absolute = resolve(root, pathEnv);
  if (!existsSync(absolute)) {
    console.error(
      "Conta de serviço não encontrada. Rode npm run setup:service-account ou defina FIREBASE_SERVICE_ACCOUNT_JSON.",
    );
    process.exit(1);
  }
  return JSON.parse(readFileSync(absolute, "utf8"));
}

function requirePlatformAdminEmail() {
  const email = process.env.PLATFORM_ADMIN_EMAIL?.trim().toLowerCase();
  if (!email) {
    console.error("Defina PLATFORM_ADMIN_EMAIL antes de executar o script.");
    process.exit(1);
  }
  return email;
}

async function main() {
  const PLATFORM_ADMIN_EMAIL = requirePlatformAdminEmail();
  const args = process.argv.slice(2);
  let email = null;
  let uid = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--uid" && args[i + 1]) {
      uid = args[++i];
    } else if (!args[i].startsWith("-")) {
      email = args[i];
    }
  }

  if (!email && !uid) {
    console.error("Uso: node scripts/grant-platform-admin.mjs usuario@email.com");
    console.error("     node scripts/grant-platform-admin.mjs --uid FIREBASE_UID");
    process.exit(1);
  }

  const { initializeApp, cert, getApps } = await import("firebase-admin/app");
  const { getAuth } = await import("firebase-admin/auth");

  if (getApps().length === 0) {
    const serviceAccount = loadServiceAccount();
    initializeApp({
      credential: cert(serviceAccount),
      projectId:
        serviceAccount.project_id ??
        process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ??
        "waitless-queue-saas",
    });
  }

  const auth = getAuth();

  if (!uid && email) {
    const user = await auth.getUserByEmail(email);
    uid = user.uid;
  }

  const user = await auth.getUser(uid);
  const userEmail = (user.email ?? "").trim().toLowerCase();

  if (userEmail !== PLATFORM_ADMIN_EMAIL) {
    console.error(
      `Apenas ${PLATFORM_ADMIN_EMAIL} pode receber platformAdmin. E-mail atual: ${user.email ?? "(sem e-mail)"}`,
    );
    process.exit(1);
  }

  const existing = user.customClaims ?? {};

  await auth.setCustomUserClaims(uid, {
    ...existing,
    platformAdmin: true,
  });

  console.log(`platformAdmin concedido a ${user.email ?? uid} (${uid})`);
  console.log("O usuário precisa fazer logout/login para o claim entrar em vigor.");
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
