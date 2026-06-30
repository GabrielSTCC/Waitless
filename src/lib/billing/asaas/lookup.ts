import type { Firestore } from "firebase-admin/firestore";

export async function findCompanyIdByAsaasSubscriptionId(
  db: Firestore,
  subscriptionId: string,
): Promise<string | null> {
  const snap = await db
    .collection("companies")
    .where("subscription.asaasSubscriptionId", "==", subscriptionId)
    .limit(1)
    .get();
  if (snap.empty) return null;
  return snap.docs[0].id;
}

export async function findCompanyIdByAsaasCustomerId(
  db: Firestore,
  customerId: string,
): Promise<string | null> {
  const snap = await db
    .collection("companies")
    .where("subscription.asaasCustomerId", "==", customerId)
    .limit(1)
    .get();
  if (snap.empty) return null;
  return snap.docs[0].id;
}
