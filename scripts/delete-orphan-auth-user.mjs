#!/usr/bin/env node
/**
 * Remove usuário Firebase Auth órfão (empresa já excluída, e-mail ainda bloqueado no cadastro).
 *
 * Uso:
 *   node scripts/delete-orphan-auth-user.mjs usuario@email.com
 *   node scripts/delete-orphan-auth-user.mjs --uid FIREBASE_UID
 *
 * Requer FIREBASE_SERVICE_ACCOUNT_PATH ou FIREBASE_SERVICE_ACCOUNT_JSON.
 */

import { createHash } from "node:crypto";
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

function hashEmail(email) {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}

async function main() {
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
    console.error("Uso: node scripts/delete-orphan-auth-user.mjs usuario@email.com");
    console.error("     node scripts/delete-orphan-auth-user.mjs --uid FIREBASE_UID");
    process.exit(1);
  }

  const { initializeApp, cert, getApps } = await import("firebase-admin/app");
  const { getAuth } = await import("firebase-admin/auth");
  const { getFirestore } = await import("firebase-admin/firestore");

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
  const db = getFirestore();

  if (!uid && email) {
    try {
      const user = await auth.getUserByEmail(email.trim().toLowerCase());
      uid = user.uid;
    } catch (error) {
      const code = error?.code;
      if (code === "auth/user-not-found") {
        console.log("Usuário Auth não encontrado — e-mail já está livre.");
        process.exit(0);
      }
      throw error;
    }
  }

  const user = await auth.getUser(uid);
  const userEmail = (user.email ?? email ?? "").trim().toLowerCase();

  const memberSnap = await db.doc(`members/${uid}`).get();
  if (memberSnap.exists) {
    console.error(
      `Abortado: members/${uid} ainda existe (companyId=${memberSnap.data()?.companyId}). Exclua a empresa antes ou use o fluxo normal de exclusão.`,
    );
    process.exit(1);
  }

  if (userEmail) {
    const authSecurityRef = db.doc(`authSecurity/${hashEmail(userEmail)}`);
    const authSecuritySnap = await authSecurityRef.get();
    if (authSecuritySnap.exists) {
      await authSecurityRef.delete();
      console.log(`authSecurity/${hashEmail(userEmail)} removido.`);
    }
  }

  await auth.deleteUser(uid);
  console.log(`Usuário Auth removido: ${uid}${userEmail ? ` (${userEmail})` : ""}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
