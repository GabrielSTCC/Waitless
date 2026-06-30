import { createHash } from "crypto";
import type { Auth } from "firebase-admin/auth";
import type { Firestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

const FLAT_SUBCOLLECTIONS = ["queue", "activeWaiting", "meta", "whatsappLogs"] as const;
const ACTIVE_STATUSES = ["active", "trialing", "past_due"];

interface MemberRecord {
  uid: string;
  email?: string;
}

interface SubscriptionData {
  stripeSubscriptionId?: string;
  asaasSubscriptionId?: string;
}

function hashEmail(email: string): string {
  return createHash("sha256")
    .update(email.trim().toLowerCase())
    .digest("hex");
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

async function deleteStoragePrefix(companyId: string): Promise<void> {
  try {
    const bucket = getStorage().bucket();
    await bucket.deleteFiles({ prefix: `companies/${companyId}/` });
  } catch {
    // Storage may be empty
  }
}

async function cancelStripeSubscription(subscriptionId: string): Promise<void> {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return;

  const response = await fetch(
    `https://api.stripe.com/v1/subscriptions/${encodeURIComponent(subscriptionId)}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${key}`,
      },
    },
  );

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Stripe cancel failed (${response.status}): ${body}`);
  }
}

async function cancelAsaasSubscription(subscriptionId: string): Promise<void> {
  const key = process.env.ASAAS_API_KEY?.trim();
  if (!key) return;

  const base =
    process.env.ASAAS_API_BASE_URL?.trim() ||
    (process.env.ASAAS_ENV === "production"
      ? "https://api.asaas.com/v3"
      : "https://sandbox.asaas.com/api/v3");

  const response = await fetch(`${base}/subscriptions/${encodeURIComponent(subscriptionId)}`, {
    method: "DELETE",
    headers: {
      accept: "application/json",
      access_token: key,
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Asaas cancel failed (${response.status}): ${body}`);
  }
}

async function cancelSubscriptionsOnDelete(
  subscription: SubscriptionData | undefined,
): Promise<void> {
  if (!subscription) return;

  const tasks: Promise<void>[] = [];

  if (subscription.stripeSubscriptionId) {
    tasks.push(
      cancelStripeSubscription(subscription.stripeSubscriptionId).catch((error) => {
        console.error("[delete-company] Stripe cancel failed:", error);
      }),
    );
  }

  if (subscription.asaasSubscriptionId) {
    tasks.push(
      cancelAsaasSubscription(subscription.asaasSubscriptionId).catch((error) => {
        console.error("[delete-company] Asaas cancel failed:", error);
      }),
    );
  }

  await Promise.all(tasks);
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

export function hasActiveSubscriptionStatus(status: string | undefined): boolean {
  return ACTIVE_STATUSES.includes(status ?? "none");
}

export function hasPaidSubscriptionData(
  subscription: { status?: string; planId?: string } | undefined,
): boolean {
  if (!subscription) return false;
  const { status, planId } = subscription;
  return hasActiveSubscriptionStatus(status) && (planId === "essential" || planId === "pro");
}

export async function deleteCompanyCascade(
  db: Firestore,
  auth: Auth,
  companyId: string,
): Promise<void> {
  const companySnap = await db.doc(`companies/${companyId}`).get();
  const subscription = companySnap.data()?.subscription as SubscriptionData | undefined;

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

  await deleteStoragePrefix(companyId);

  await deleteMemberAuthAndSecurity(auth, db, members);
}
