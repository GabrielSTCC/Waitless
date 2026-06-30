#!/usr/bin/env node
/**
 * Define a senha do admin da plataforma no Firebase Auth.
 *
 * Uso (não commite a senha no repositório):
 *   PLATFORM_ADMIN_PASSWORD='sua-senha' node scripts/set-platform-admin-password.mjs
 *
 * Requer FIREBASE_SERVICE_ACCOUNT_PATH ou FIREBASE_SERVICE_ACCOUNT_JSON.
 */

import { existsSync, readFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function requirePlatformAdminEmail() {
  const email = process.env.PLATFORM_ADMIN_EMAIL?.trim().toLowerCase();
  if (!email) {
    console.error("Defina PLATFORM_ADMIN_EMAIL antes de executar o script.");
    process.exit(1);
  }
  return email;
}

function userUidFromEmail(email) {
  const normalized = email.trim().toLowerCase();
  const atIndex = normalized.indexOf("@");
  const localPart = atIndex >= 0 ? normalized.slice(0, atIndex) : normalized;
  const domainPart = atIndex >= 0 ? normalized.slice(atIndex + 1) : "unknown";
  const sanitize = (value) =>
    value.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").replace(/_+/g, "_");
  const safeLocal = sanitize(localPart) || "user";
  const safeDomain = sanitize(domainPart) || "unknown";
  return `${safeLocal}_at_${safeDomain}`.slice(0, 128);
}

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

async function main() {
  const PLATFORM_ADMIN_EMAIL = requirePlatformAdminEmail();
  const password = process.env.PLATFORM_ADMIN_PASSWORD?.trim();
  if (!password || password.length < 8) {
    console.error(
      "Defina PLATFORM_ADMIN_PASSWORD (mín. 8 caracteres) ao executar o script.",
    );
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
  let user;

  try {
    user = await auth.getUserByEmail(PLATFORM_ADMIN_EMAIL);
    await auth.updateUser(user.uid, { password });
    console.log(`Senha atualizada para ${PLATFORM_ADMIN_EMAIL} (${user.uid})`);
  } catch (error) {
    const code = error?.code ?? error?.errorInfo?.code;
    if (code !== "auth/user-not-found") {
      throw error;
    }
    user = await auth.createUser({
      uid: userUidFromEmail(PLATFORM_ADMIN_EMAIL),
      email: PLATFORM_ADMIN_EMAIL,
      password,
      emailVerified: true,
    });
    console.log(`Usuário criado: ${PLATFORM_ADMIN_EMAIL} (${user.uid})`);
  }

  const existing = (await auth.getUser(user.uid)).customClaims ?? {};
  await auth.setCustomUserClaims(user.uid, {
    ...existing,
    platformAdmin: true,
  });
  console.log("Custom claim platformAdmin garantido.");
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
