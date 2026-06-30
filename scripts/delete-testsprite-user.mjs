#!/usr/bin/env node
/**
 * Remove usuário e company de teste E2E do Firebase (produção ou dev).
 *
 * Uso:
 *   TESTSPRITE_EMAIL=test@waitless.test npm run delete:testsprite-user
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
      "Conta de serviço não encontrada. Rode npm run setup:service-account.",
    );
    process.exit(1);
  }
  return JSON.parse(readFileSync(absolute, "utf8"));
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

async function deleteCollection(db, collectionPath, batchSize = 200) {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const snap = await db.collection(collectionPath).limit(batchSize).get();
    if (snap.empty) break;
    const batch = db.batch();
    snap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    if (snap.size < batchSize) break;
  }
}

async function main() {
  const email = process.env.TESTSPRITE_EMAIL?.trim().toLowerCase();
  if (!email) {
    console.error("Defina TESTSPRITE_EMAIL (ex.: test@waitless.test).");
    process.exit(1);
  }

  const companyId = slugFromCompanyName(
    process.env.TESTSPRITE_COMPANY_NAME ?? "Estabelecimento TestSprite",
  );

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

  console.log(`Removendo dados de teste: ${email} / company ${companyId}\n`);

  try {
    const user = await auth.getUserByEmail(email);
    await deleteCollection(db, `members/${user.uid}/trustedDevices`);
    await db.doc(`members/${user.uid}`).delete().catch(() => {});
    await auth.deleteUser(user.uid);
    console.log(`Usuário Auth removido: ${email}`);
  } catch (error) {
    const code = error?.code ?? error?.errorInfo?.code;
    if (code === "auth/user-not-found") {
      console.log(`Usuário ${email} não encontrado — ok.`);
    } else {
      throw error;
    }
  }

  const companyRef = db.doc(`companies/${companyId}`);
  const companySnap = await companyRef.get();
  if (companySnap.exists) {
    const clientsSnap = await companyRef.collection("clients").get();
    for (const clientDoc of clientsSnap.docs) {
      await deleteCollection(db, `companies/${companyId}/clients/${clientDoc.id}/visits`);
    }
    await deleteCollection(db, `companies/${companyId}/clients`);
    await deleteCollection(db, `companies/${companyId}/queue`);
    await deleteCollection(db, `companies/${companyId}/activeWaiting`);
    await deleteCollection(db, `companies/${companyId}/invites`);
    await deleteCollection(db, `companies/${companyId}/members`);

    const pqSnap = await db
      .collection("publicQueue")
      .where("companyId", "==", companyId)
      .get();
    const batch = db.batch();
    pqSnap.docs.forEach((doc) => batch.delete(doc.ref));
    if (!pqSnap.empty) await batch.commit();

    await companyRef.delete();
    console.log(`Company removida: ${companyId}`);
  } else {
    console.log(`Company ${companyId} não encontrada — ok.`);
  }

  console.log("\nLimpeza concluída.");
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
