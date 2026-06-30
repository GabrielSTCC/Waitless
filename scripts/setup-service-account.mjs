#!/usr/bin/env node
/**
 * Configura credenciais Firebase Admin para upload de logo no servidor.
 *
 * 1. Baixe a chave em Firebase Console → Configurações → Contas de serviço → Gerar nova chave
 * 2. Salve como secrets/firebase-service-account.json
 * 3. Rode: npm run setup:service-account
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const secretsDir = join(root, "secrets");
const keyFile = join(secretsDir, "firebase-service-account.json");
const envLocal = join(root, ".env.local");
const relPath = "secrets/firebase-service-account.json";

function upsertEnvLine(content, key, value) {
  const line = `${key}=${value}`;
  const regex = new RegExp(`^${key}=.*$`, "m");
  if (regex.test(content)) {
    return content.replace(regex, line);
  }
  const trimmed = content.trimEnd();
  return trimmed ? `${trimmed}\n${line}\n` : `${line}\n`;
}

async function validateAdmin() {
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH = relPath;
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID =
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "waitless-queue-saas";
  process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET =
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ??
    "waitless-queue-saas.firebasestorage.app";

  const { initializeApp, cert, getApps } = await import("firebase-admin/app");
  const { getStorage } = await import("firebase-admin/storage");

  if (getApps().length === 0) {
    const serviceAccount = JSON.parse(readFileSync(keyFile, "utf8"));
    initializeApp({
      credential: cert(serviceAccount),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
  }

  const [exists] = await getStorage().bucket().exists();
  if (!exists) {
    throw new Error("Bucket de Storage não encontrado. Rode npm run setup:firebase-storage.");
  }
}

console.log("Waitless — setup da conta de serviço (Firebase Admin)\n");

if (!existsSync(secretsDir)) {
  mkdirSync(secretsDir, { recursive: true });
  console.log(`Pasta criada: ${relPath.replace(/\/[^/]+$/, "/")}`);
}

if (!existsSync(keyFile)) {
  console.error("Arquivo não encontrado:", relPath);
  console.error("\nPassos:");
  console.error(
    "  1. Abra https://console.firebase.google.com/project/waitless-queue-saas/settings/serviceaccounts/adminsdk",
  );
  console.error("  2. Clique em «Gerar nova chave privada»");
  console.error(`  3. Salve o JSON como ${relPath}`);
  console.error("  4. Rode novamente: npm run setup:service-account\n");
  process.exit(1);
}

let envContent = existsSync(envLocal) ? readFileSync(envLocal, "utf8") : "";
envContent = upsertEnvLine(envContent, "FIREBASE_SERVICE_ACCOUNT_PATH", relPath);
writeFileSync(envLocal, envContent, "utf8");

console.log(`Chave encontrada: ${relPath}`);
console.log(`Atualizado: .env.local → FIREBASE_SERVICE_ACCOUNT_PATH=${relPath}`);

try {
  await validateAdmin();
  console.log("Validação OK: Firebase Admin conectou ao bucket de Storage.\n");
  console.log("Reinicie o servidor: npm run dev");
} catch (error) {
  console.error("\nValidação falhou:", error instanceof Error ? error.message : error);
  process.exit(1);
}
