import { FieldValue, type Firestore } from "firebase-admin/firestore";

export function getCurrentMonthKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export async function incrementMonthlyCompletionCount(
  db: Firestore,
  companyId: string,
): Promise<void> {
  const billingRef = db.doc(`companies/${companyId}/meta/billing`);
  const monthKey = getCurrentMonthKey();

  await db.runTransaction(async (transaction) => {
    const snap = await transaction.get(billingRef);
    const data = snap.data();
    const sameMonth = data?.monthKey === monthKey;
    const current = sameMonth ? ((data?.completedCount as number | undefined) ?? 0) : 0;

    transaction.set(
      billingRef,
      {
        monthKey,
        completedCount: current + 1,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  });
}
