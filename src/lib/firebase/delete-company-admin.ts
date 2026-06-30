import type { Firestore } from "firebase-admin/firestore";
import type { Storage } from "firebase-admin/storage";
import type { Auth } from "firebase-admin/auth";
import { cancelSubscriptionsOnDelete } from "@/lib/billing/cancel-subscription-on-delete";
import { hashEmail } from "@/lib/auth/two-factor-server";
import type { CompanySubscription } from "@/lib/types";

const FLAT_SUBCOLLECTIONS = ["queue", "activeWaiting", "meta", "whatsappLogs"] as const;

interface MemberRecord {
  uid: string;
  email?: string;
}

async function deleteCollection(
  db: Firestore,
  collectionPath: string,
  batchSize = 200,
): Promise<void> {
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

async function deleteClientsWithVisits(db: Firestore, companyId: string): Promise<void> {
  const clientsRef = db.collection(`companies/${companyId}/clients`);
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const snap = await clientsRef.limit(50).get();
    if (snap.empty) break;
    await Promise.all(
      snap.docs.map(async (clientDoc) => {
        await deleteCollection(
          db,
          `companies/${companyId}/clients/${clientDoc.id}/visits`,
        );
        await clientDoc.ref.delete();
      }),
    );
  }
}

async function deletePublicQueueByCompany(
  db: Firestore,
  companyId: string,
): Promise<void> {
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

async function deleteStoragePrefix(storage: Storage, companyId: string): Promise<void> {
  try {
    const bucket = storage.bucket();
    await bucket.deleteFiles({ prefix: `companies/${companyId}/` });
  } catch {
    // Storage may be empty or unavailable in dev
  }
}

async function deleteMemberAuthAndSecurity(
  auth: Auth,
  db: Firestore,
  members: MemberRecord[],
): Promise<void> {
  const seenUids = new Set<string>();

  for (const { uid, email } of members) {
    if (email) {
      try {
        await db.doc(`authSecurity/${hashEmail(email)}`).delete();
      } catch {
        // authSecurity doc may not exist
      }
    }

    if (seenUids.has(uid)) continue;
    seenUids.add(uid);

    try {
      await auth.deleteUser(uid);
    } catch (error) {
      const code = (error as { code?: string })?.code;
      if (code !== "auth/user-not-found") {
        console.warn(`[delete-company] Failed to delete auth user ${uid}:`, error);
      }
    }
  }
}

export async function deleteCompanyCascade(
  db: Firestore,
  storage: Storage,
  auth: Auth,
  companyId: string,
): Promise<void> {
  const companySnap = await db.doc(`companies/${companyId}`).get();
  const subscription = companySnap.data()?.subscription as CompanySubscription | undefined;

  await cancelSubscriptionsOnDelete(subscription);

  await deleteClientsWithVisits(db, companyId);

  for (const sub of FLAT_SUBCOLLECTIONS) {
    await deleteCollection(db, `companies/${companyId}/${sub}`);
  }

  const membersSnap = await db
    .collection("members")
    .where("companyId", "==", companyId)
    .get();

  const members: MemberRecord[] = membersSnap.docs.map((doc) => ({
    uid: doc.id,
    email: doc.data()?.email as string | undefined,
  }));

  for (const { uid } of members) {
    await deleteCollection(db, `members/${uid}/trustedDevices`);
  }

  const invitesSnap = await db
    .collection("invites")
    .where("companyId", "==", companyId)
    .get();

  await deletePublicQueueByCompany(db, companyId);

  const batch = db.batch();
  membersSnap.docs.forEach((doc) => batch.delete(doc.ref));
  invitesSnap.docs.forEach((doc) => batch.delete(doc.ref));
  batch.delete(db.doc(`companies/${companyId}`));
  await batch.commit();

  await deleteStoragePrefix(storage, companyId);

  await deleteMemberAuthAndSecurity(auth, db, members);
}
