#!/usr/bin/env node
/**
 * Seed idempotente para testes E2E (TestSprite) no painel admin.
 *
 * Uso: TESTSPRITE_EMAIL=... TESTSPRITE_PASSWORD=... npm run seed:testsprite
 * Requer FIREBASE_SERVICE_ACCOUNT_PATH ou FIREBASE_SERVICE_ACCOUNT_JSON.
 * Use apenas em ambiente local ou emulador — não commite credenciais.
 */

import { existsSync, readFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function requireTestCredentials() {
  const email = process.env.TESTSPRITE_EMAIL?.trim().toLowerCase();
  const password = process.env.TESTSPRITE_PASSWORD?.trim();
  if (!email || !password) {
    console.error(
      "Defina TESTSPRITE_EMAIL e TESTSPRITE_PASSWORD antes de rodar o seed.",
    );
    process.exit(1);
  }
  return { email, password };
}

const COMPANY_NAME = "Estabelecimento TestSprite";

const SEED_CLIENTS = [
  { id: "testsprite-ana", name: "Ana Silva", whatsapp: "11999990001" },
  { id: "testsprite-bruno", name: "Bruno Costa", whatsapp: "11999990002" },
  { id: "testsprite-carla", name: "Carla Mendes", whatsapp: "11999990003" },
  { id: "testsprite-diego", name: "Diego Souza", whatsapp: "11999990004" },
  { id: "testsprite-elena", name: "Elena Rocha", whatsapp: "11999990005" },
  { id: "testsprite-felipe", name: "Felipe Lima", whatsapp: "11999990006" },
];

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

function slugFromCompanyName(name) {
  return name
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function normalizeWhatsapp(value) {
  return value.replace(/\D/g, "");
}

function normalizeName(value) {
  return value.trim().toLowerCase();
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
      "Conta de serviço não encontrada. Rode npm run setup:service-account.",
    );
    process.exit(1);
  }
  return JSON.parse(readFileSync(absolute, "utf8"));
}

async function deleteCollection(db, collectionPath, batchSize = 200) {
  const collRef = db.collection(collectionPath);
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const snap = await collRef.limit(batchSize).get();
    if (snap.empty) break;
    const batch = db.batch();
    snap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    if (snap.size < batchSize) break;
  }
}

async function deletePublicQueueByCompany(db, companyId) {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const snap = await db
      .collection("publicQueue")
      .where("companyId", "==", companyId)
      .limit(200)
      .get();
    if (snap.empty) break;
    const batch = db.batch();
    snap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    if (snap.size < 200) break;
  }
}

async function main() {
  const { email: TEST_EMAIL, password: TEST_PASSWORD } = requireTestCredentials();
  const { initializeApp, cert, getApps } = await import("firebase-admin/app");
  const { getAuth } = await import("firebase-admin/auth");
  const { getFirestore, FieldValue, Timestamp } = await import("firebase-admin/firestore");

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
  const uid = userUidFromEmail(TEST_EMAIL);
  const companyId = slugFromCompanyName(COMPANY_NAME);
  const normalizedEmail = TEST_EMAIL.trim().toLowerCase();

  console.log("Waitless — seed TestSprite E2E\n");

  let user;
  try {
    user = await auth.getUserByEmail(normalizedEmail);
    await auth.updateUser(user.uid, {
      password: TEST_PASSWORD,
      emailVerified: true,
    });
    console.log(`Usuário atualizado: ${normalizedEmail} (${user.uid})`);
  } catch (error) {
    const code = error?.code ?? error?.errorInfo?.code;
    if (code !== "auth/user-not-found") throw error;
    user = await auth.createUser({
      uid,
      email: normalizedEmail,
      password: TEST_PASSWORD,
      emailVerified: true,
    });
    console.log(`Usuário criado: ${normalizedEmail} (${user.uid})`);
  }

  const memberRef = db.doc(`members/${user.uid}`);
  const companyRef = db.doc(`companies/${companyId}`);
  const memberSnap = await memberRef.get();
  const companySnap = await companyRef.get();

  if (!companySnap.exists) {
    await companyRef.set({
      name: COMPANY_NAME,
      ownerId: user.uid,
      avgServiceTimeMin: 10,
      toleranceEnabled: false,
      toleranceMin: 5,
      billingCountry: "BR",
      billingMarket: "BR",
      defaultLocale: "pt-BR",
      subscription: { status: "active", planId: "essential" },
      createdAt: FieldValue.serverTimestamp(),
    });
    console.log(`Company criada: ${companyId}`);
  } else {
    await companyRef.set(
      { subscription: { status: "active", planId: "essential" } },
      { merge: true },
    );
    console.log(`Company existente: ${companyId} (plano essential ativo)`);
  }

  const memberData = {
    companyId,
    email: normalizedEmail,
    role: "owner",
    security: {
      twoFactorEnabled: false,
      twoFactorPending: false,
      requireTwoFactorOnNextLogin: false,
    },
  };

  if (!memberSnap.exists) {
    await memberRef.set(memberData);
    console.log(`Member criado para ${user.uid}`);
  } else {
    await memberRef.set(memberData, { merge: true });
    console.log(`Member atualizado (2FA desabilitado)`);
  }

  console.log("Limpando fila e activeWaiting...");
  await deleteCollection(db, `companies/${companyId}/queue`);
  await deleteCollection(db, `companies/${companyId}/activeWaiting`);
  await deletePublicQueueByCompany(db, companyId);

  const now = Timestamp.now();
  for (const client of SEED_CLIENTS) {
    const clientRef = db.doc(`companies/${companyId}/clients/${client.id}`);
    await clientRef.set(
      {
        name: client.name,
        whatsapp: client.whatsapp,
        normalizedWhatsapp: normalizeWhatsapp(client.whatsapp),
        normalizedName: normalizeName(client.name),
        visitCount: 1,
        createdAt: now,
        lastVisitAt: now,
      },
      { merge: true },
    );
    console.log(`Cliente seed: ${client.name}`);
  }

  console.log("\n--- Seed TestSprite concluído ---");
  console.log(`Company: ${companyId}`);
  console.log(`Login: http://localhost:3000/admin/auth`);
  console.log("------------------------------\n");
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
