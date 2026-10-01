#!/usr/bin/env node
/**
 * Limpa exclusivamente a empresa waitless-loadtest e o usuário Auth de teste.
 */
import { ADMIN_EMAIL, COMPANY_ID } from "./constants.mjs";
import { getFirebaseAdmin } from "./firebase.mjs";

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

async function deleteQuery(db, query, batchSize = 200) {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const snap = await query.limit(batchSize).get();
    if (snap.empty) break;
    const batch = db.batch();
    snap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    if (snap.size < batchSize) break;
  }
}

async function deleteClientSubcollections(db, companyId) {
  const clients = await db.collection(`companies/${companyId}/clients`).get();
  for (const doc of clients.docs) {
    await deleteCollection(db, `companies/${companyId}/clients/${doc.id}/visits`);
  }
}

export async function cleanupLoadtestCompany({ deleteAuthUser = true } = {}) {
  const { auth, db } = await getFirebaseAdmin();
  const companyId = COMPANY_ID;

  console.log(`[cleanup] Limpando empresa ${companyId}...`);

  const appointments = await db.collection(`companies/${companyId}/appointments`).get();
  const tokens = appointments.docs
    .map((doc) => doc.data()?.publicToken)
    .filter((t) => typeof t === "string" && t.length > 0);

  const queueSnap = await db.collection(`companies/${companyId}/queue`).get();
  for (const doc of queueSnap.docs) {
    const token = doc.data()?.publicToken;
    if (typeof token === "string" && token.length > 0) tokens.push(token);
  }

  await deleteClientSubcollections(db, companyId);
  await deleteCollection(db, `companies/${companyId}/queue`);
  await deleteCollection(db, `companies/${companyId}/activeWaiting`);
  await deleteCollection(db, `companies/${companyId}/appointments`);
  await deleteCollection(db, `companies/${companyId}/clients`);
  await deleteCollection(db, `companies/${companyId}/professionals`);
  await deleteCollection(db, `companies/${companyId}/meta`);

  await deleteQuery(
    db,
    db.collection("publicQueue").where("companyId", "==", companyId),
  );

  const uniqueTokens = [...new Set(tokens)];
  for (let i = 0; i < uniqueTokens.length; i += 200) {
    const chunk = uniqueTokens.slice(i, i + 200);
    const batch = db.batch();
    for (const token of chunk) {
      batch.delete(db.doc(`appointmentTokens/${token}`));
    }
    await batch.commit();
  }

  try {
    await deleteQuery(
      db,
      db.collection("appointmentTokens").where("companyId", "==", companyId),
    );
  } catch {
    // índice pode não existir — tokens já removidos acima
  }

  const memberSnap = await db
    .collection("members")
    .where("companyId", "==", companyId)
    .get();
  if (!memberSnap.empty) {
    const batch = db.batch();
    memberSnap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }

  await db.doc(`companies/${companyId}`).delete().catch(() => {});

  if (deleteAuthUser) {
    try {
      const user = await auth.getUserByEmail(ADMIN_EMAIL);
      await auth.deleteUser(user.uid);
      console.log(`[cleanup] Auth user removido: ${ADMIN_EMAIL}`);
    } catch (error) {
      const code = error?.code ?? error?.errorInfo?.code;
      if (code !== "auth/user-not-found") {
        console.warn(`[cleanup] Auth: ${error.message ?? error}`);
      }
    }
  }

  console.log("[cleanup] Concluído.");
}

const isMain = process.argv[1]?.endsWith("cleanup.mjs");
if (isMain) {
  cleanupLoadtestCompany()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err.message ?? err);
      process.exit(1);
    });
}
