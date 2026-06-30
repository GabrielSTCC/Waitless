import { Timestamp, type Firestore } from "firebase-admin/firestore";

export type TerminalVisitStatus = "completed" | "cancelled" | "expired";

export async function appendClientVisit(
  db: Firestore,
  params: {
    companyId: string;
    clientId: string;
    entryId: string;
    status: TerminalVisitStatus;
    occurredAt?: Date;
  },
): Promise<void> {
  const { companyId, clientId, entryId, status, occurredAt = new Date() } = params;
  if (!companyId || !clientId || !entryId) return;

  await db
    .doc(`companies/${companyId}/clients/${clientId}/visits/${entryId}`)
    .set(
      {
        visitId: entryId,
        entryId,
        status,
        occurredAt: Timestamp.fromDate(occurredAt),
        companyId,
        clientId,
      },
      { merge: false },
    );
}
