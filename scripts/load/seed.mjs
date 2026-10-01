#!/usr/bin/env node
/**
 * Seed da empresa isolada waitless-loadtest para carga/estresse.
 * Requer FIREBASE_SERVICE_ACCOUNT_JSON (ou PATH) e NEXT_PUBLIC_FIREBASE_*.
 */
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  COMPANY_ID,
  COMPANY_NAME,
  SEED_CLIENT,
  WIDE_HOURS,
} from "./constants.mjs";
import { cleanupLoadtestCompany } from "./cleanup.mjs";
import { getFirebaseAdmin, writeContext } from "./firebase.mjs";

function normalizeWhatsapp(value) {
  return value.replace(/\D/g, "");
}

function normalizeName(value) {
  return value.trim().toLowerCase();
}

export async function seedLoadtestCompany() {
  const { auth, db } = await getFirebaseAdmin();
  const { FieldValue, Timestamp } = await import("firebase-admin/firestore");

  // Limpa restos de runs anteriores sem apagar o Auth ainda (vamos recriar/atualizar)
  await cleanupLoadtestCompany({ deleteAuthUser: false });

  console.log("[seed] Criando/atualizando usuário admin...");
  let user;
  try {
    user = await auth.getUserByEmail(ADMIN_EMAIL);
    await auth.updateUser(user.uid, {
      password: ADMIN_PASSWORD,
      emailVerified: true,
      disabled: false,
    });
  } catch (error) {
    const code = error?.code ?? error?.errorInfo?.code;
    if (code !== "auth/user-not-found") throw error;
    user = await auth.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      emailVerified: true,
    });
  }

  const companyRef = db.doc(`companies/${COMPANY_ID}`);
  await companyRef.set({
    name: COMPANY_NAME,
    ownerId: user.uid,
    avgServiceTimeMin: 10,
    toleranceEnabled: false,
    toleranceMin: 5,
    billingCountry: "BR",
    billingMarket: "BR",
    defaultLocale: "pt-BR",
    appointmentsEnabled: true,
    serviceMode: "single",
    businessHours: WIDE_HOURS,
    // Plano pro sintético: evita teto free (80) durante carga
    subscription: {
      status: "active",
      planId: "pro",
      currentPeriodEnd: Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
    },
    createdAt: FieldValue.serverTimestamp(),
  });

  await db.doc(`members/${user.uid}`).set({
    companyId: COMPANY_ID,
    email: ADMIN_EMAIL,
    role: "owner",
    security: {
      twoFactorEnabled: false,
      twoFactorPending: false,
      requireTwoFactorOnNextLogin: false,
    },
  });

  const now = Timestamp.now();
  await db.doc(`companies/${COMPANY_ID}/clients/${SEED_CLIENT.id}`).set({
    name: SEED_CLIENT.name,
    whatsapp: SEED_CLIENT.whatsapp,
    normalizedWhatsapp: normalizeWhatsapp(SEED_CLIENT.whatsapp),
    normalizedName: normalizeName(SEED_CLIENT.name),
    visitCount: 1,
    createdAt: now,
    lastVisitAt: now,
  });

  // Entrada de fila seed para token público (histórico/perfil + páginas /q)
  const publicToken = crypto.randomUUID();
  const entryId = crypto.randomUUID();
  await db.doc(`companies/${COMPANY_ID}/queue/${entryId}`).set({
    clientId: SEED_CLIENT.id,
    clientName: SEED_CLIENT.name,
    clientWhatsapp: SEED_CLIENT.whatsapp,
    status: "waiting",
    position: 1,
    publicToken,
    createdAt: FieldValue.serverTimestamp(),
  });
  await db.doc(`publicQueue/${publicToken}`).set({
    companyId: COMPANY_ID,
    companyName: COMPANY_NAME,
    entryId,
    clientId: SEED_CLIENT.id,
    clientName: SEED_CLIENT.name,
    status: "waiting",
    position: 1,
    estimatedWaitMin: 10,
    updatedAt: FieldValue.serverTimestamp(),
  });

  const context = {
    companyId: COMPANY_ID,
    companyName: COMPANY_NAME,
    adminEmail: ADMIN_EMAIL,
    adminPassword: ADMIN_PASSWORD,
    adminUid: user.uid,
    seedClient: SEED_CLIENT,
    publicToken,
    entryId,
    seededAt: new Date().toISOString(),
  };
  writeContext(context);

  console.log("[seed] Concluído.");
  console.log(`  companyId: ${COMPANY_ID}`);
  console.log(`  admin: ${ADMIN_EMAIL}`);
  console.log(`  publicToken: ${publicToken}`);
  return context;
}

const isMain = process.argv[1]?.endsWith("seed.mjs");
if (isMain) {
  seedLoadtestCompany()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err.message ?? err);
      process.exit(1);
    });
}
