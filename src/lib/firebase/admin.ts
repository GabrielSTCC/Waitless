import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { initializeApp, getApps, cert, applicationDefault } from "firebase-admin/app";
import type { App, ServiceAccount } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import {
  CREDENTIAL_SETUP_MESSAGE,
  isCredentialSetupError,
} from "@/lib/firebase/admin-constants";

export { CREDENTIAL_SETUP_MESSAGE } from "@/lib/firebase/admin-constants";

let cachedApp: App | null = null;

function loadServiceAccountFromPath(filePath: string): ServiceAccount {
  const absolute = resolve(process.cwd(), filePath);
  if (!existsSync(absolute)) {
    throw new Error(`Arquivo não encontrado: ${absolute}`);
  }
  return parseServiceAccountJson(readFileSync(absolute, "utf8"));
}

function parseServiceAccountJson(raw: string): ServiceAccount {
  const trimmed = raw.trim();
  let parsed: ServiceAccount & { private_key?: string };
  try {
    parsed = JSON.parse(trimmed) as ServiceAccount & { private_key?: string };
  } catch {
    try {
      parsed = JSON.parse(trimmed.replace(/\r?\n/g, "")) as ServiceAccount & {
        private_key?: string;
      };
    } catch {
      throw new Error(
        `${CREDENTIAL_SETUP_MESSAGE} Em produção (Vercel), defina FIREBASE_SERVICE_ACCOUNT_JSON com o JSON em uma linha.`,
      );
    }
  }
  return normalizeServiceAccount(parsed);
}

function normalizePrivateKey(key: string): string {
  if (key.includes("-----BEGIN PRIVATE KEY-----\n")) {
    return key;
  }
  return key.replace(/\\n/g, "\n");
}

function normalizeServiceAccount(
  account: ServiceAccount & { private_key?: string },
): ServiceAccount {
  const privateKey = account.private_key ?? account.privateKey;
  if (!privateKey) {
    return account;
  }

  const normalized = normalizePrivateKey(privateKey);
  return {
    ...account,
    privateKey: normalized,
  };
}

function resolveServiceAccount(): ServiceAccount | null {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (json) {
    return parseServiceAccountJson(json);
  }

  const pathEnv = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (pathEnv) {
    const absolute = resolve(process.cwd(), pathEnv);
    if (existsSync(absolute)) {
      return loadServiceAccountFromPath(pathEnv);
    }
    if (process.env.VERCEL) {
      throw new Error(
        `${CREDENTIAL_SETUP_MESSAGE} Na Vercel use FIREBASE_SERVICE_ACCOUNT_JSON (não PATH).`,
      );
    }
  }

  return null;
}

function resolveCredential(serviceAccount: ServiceAccount | null) {
  if (serviceAccount) {
    return cert(serviceAccount);
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return applicationDefault();
  }

  if (process.env.VERCEL || process.env.NODE_ENV === "production") {
    throw new Error(
      `${CREDENTIAL_SETUP_MESSAGE} Em produção (Vercel), defina FIREBASE_SERVICE_ACCOUNT_JSON.`,
    );
  }

  return applicationDefault();
}

function resolveProjectId(serviceAccount: ServiceAccount | null): string {
  const fromServiceAccount =
    (serviceAccount as ServiceAccount & { project_id?: string })?.project_id ??
    serviceAccount?.projectId;
  const fromEnv = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const fallback = "waitless-queue-saas";

  if (fromServiceAccount && fromEnv && fromServiceAccount !== fromEnv) {
    console.warn(
      `[firebase-admin] projectId divergente: service account="${fromServiceAccount}" vs NEXT_PUBLIC_FIREBASE_PROJECT_ID="${fromEnv}". Usando service account.`,
    );
  }

  return fromServiceAccount ?? fromEnv ?? fallback;
}

export function getAdminApp(): App {
  if (cachedApp) return cachedApp;
  if (getApps().length > 0) {
    cachedApp = getApps()[0]!;
    return cachedApp;
  }

  const serviceAccount = resolveServiceAccount();
  const projectId = resolveProjectId(serviceAccount);
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

  cachedApp = initializeApp({
    credential: resolveCredential(serviceAccount),
    projectId,
    storageBucket,
  });
  return cachedApp;
}

export function getAdminAuth() {
  return getAuth(getAdminApp());
}

export function getAdminDb() {
  return getFirestore(getAdminApp());
}

export function getAdminStorage() {
  return getStorage(getAdminApp());
}

export function isCredentialError(error: unknown): boolean {
  const code = (error as { code?: string })?.code;
  const message = error instanceof Error ? error.message : String(error);
  return (
    code === "app/invalid-credential" ||
    isCredentialSetupError(message) ||
    message.includes("ENOENT") ||
    message.includes("Arquivo não encontrado") ||
    message.includes("Invalid PEM") ||
    message.includes("Failed to parse private key") ||
    (message.includes("credential") && message.includes("default"))
  );
}
