import type { DocumentData, Firestore, Timestamp } from "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";
import {
  assertMonthlyCompletionAllowed,
  PlanLimitError,
} from "@/lib/billing/plan-limits";
import { assertCanOperateQueue, TrialExpiredError } from "@/lib/billing/trial";
import { getCurrentMonthKey } from "@/lib/billing/usage";
import { mapCompanyFromAdminData } from "@/lib/auth/session-server";
import { ClientAlreadyInQueueError } from "@/lib/errors/queue";
import { normalizeName, normalizeWhatsapp } from "@/lib/utils/format";
import { buildPublicQueueCompanyFields } from "@/lib/queue/public-queue-company-fields";
import { estimateWaitMin } from "@/lib/utils/queue-estimate";
import type { Company, QueueStatus } from "@/lib/types";
import { appendClientVisit } from "@/lib/firebase/client-visits-server";

export { PlanLimitError, ClientAlreadyInQueueError, TrialExpiredError };

async function getMonthlyCompletionCountServer(
  db: Firestore,
  companyId: string,
): Promise<number> {
  const snap = await db.doc(`companies/${companyId}/meta/billing`).get();
  const data = snap.data();
  const currentKey = getCurrentMonthKey();
  if (data?.monthKey !== currentKey) return 0;
  return (data?.completedCount as number | undefined) ?? 0;
}

async function loadCompanyServer(db: Firestore, companyId: string): Promise<Company | null> {
  const snap = await db.doc(`companies/${companyId}`).get();
  if (!snap.exists) return null;
  return mapCompanyFromAdminData(snap.id, snap.data()!);
}

function buildPublicQueuePayload(
  token: string,
  company: Company,
  entry: {
    id: string;
    clientId: string;
    clientName: string;
    status: QueueStatus;
    toleranceExpiresAt?: Date;
  },
  displayPosition: number,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    companyId: company.id,
    entryId: entry.id,
    status: entry.status,
    position: displayPosition,
    ...buildPublicQueueCompanyFields(company, displayPosition),
    clientName: entry.clientName,
    clientId: entry.clientId,
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (entry.toleranceExpiresAt) {
    payload.toleranceExpiresAt = entry.toleranceExpiresAt;
  }

  return payload;
}

async function incrementAnalyticsOnCompleteServer(
  db: Firestore,
  companyId: string,
  entryData: DocumentData | undefined,
): Promise<void> {
  const analyticsRef = db.doc(`companies/${companyId}/meta/analytics`);
  const createdAt = entryData?.createdAt as Timestamp | undefined;
  const waitMin = createdAt
    ? Math.max(0, Math.round((Date.now() - createdAt.toDate().getTime()) / 60000))
    : 0;

  await db.runTransaction(async (transaction) => {
    const snap = await transaction.get(analyticsRef);
    const current = snap.data() ?? {};
    const totalServed = (current.totalServed ?? 0) + 1;
    const prevAvg = current.avgWaitMinToday ?? 0;
    const prevCount = current.totalServedToday ?? 0;
    const newCount = prevCount + 1;
    const avgWaitMinToday = Math.round((prevAvg * prevCount + waitMin) / newCount);

    transaction.set(
      analyticsRef,
      {
        totalServed,
        totalServedToday: newCount,
        avgWaitMinToday,
        lastUpdated: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  });
}

export async function addToQueueServer(
  db: Firestore,
  companyId: string,
  input: { name: string; whatsapp: string },
  avgServiceTimeMin: number,
): Promise<string> {
  const company = await loadCompanyServer(db, companyId);
  if (!company) throw new Error("Empresa não encontrada.");

  assertCanOperateQueue(company);

  const monthlyCount = await getMonthlyCompletionCountServer(db, companyId);
  assertMonthlyCompletionAllowed(company, monthlyCount);

  const normalizedWhatsapp = normalizeWhatsapp(input.whatsapp);
  const normalizedClientName = normalizeName(input.name);
  const clientsRef = db.collection(`companies/${companyId}/clients`);
  const queueRef = db.collection(`companies/${companyId}/queue`);

  const existingSnap = await clientsRef
    .where("normalizedWhatsapp", "==", normalizedWhatsapp)
    .limit(1)
    .get();

  let clientId: string;
  let clientName = input.name.trim();
  let clientWhatsapp = input.whatsapp.trim();
  let isExistingClient = false;

  if (!existingSnap.empty) {
    const existingDoc = existingSnap.docs[0];
    clientId = existingDoc.id;
    const data = existingDoc.data();
    clientName = data.name as string;
    clientWhatsapp = data.whatsapp as string;
    isExistingClient = true;
  } else {
    clientId = crypto.randomUUID();
    await clientsRef.doc(clientId).set({
      name: clientName,
      whatsapp: clientWhatsapp,
      normalizedWhatsapp,
      normalizedName: normalizedClientName,
      visitCount: 1,
      createdAt: FieldValue.serverTimestamp(),
      lastVisitAt: FieldValue.serverTimestamp(),
    });
  }

  const entryId = crypto.randomUUID();
  const publicToken = crypto.randomUUID();
  const activeWaitingRef = db.doc(`companies/${companyId}/activeWaiting/${clientId}`);
  const counterRef = db.doc(`companies/${companyId}/meta/queue`);

  let nextPosition = 0;
  let nextTicket = 0;

  await db.runTransaction(async (transaction) => {
    const activeSnap = await transaction.get(activeWaitingRef);
    if (activeSnap.exists) {
      throw new ClientAlreadyInQueueError(clientName);
    }

    const counterSnap = await transaction.get(counterRef);
    const lastPosition = counterSnap.data()?.lastPosition ?? 0;
    const lastTicket = counterSnap.data()?.lastTicket ?? 0;
    nextPosition = lastPosition + 1;
    nextTicket = lastTicket + 1;

    if (isExistingClient) {
      const clientRef = clientsRef.doc(clientId);
      const clientSnap = await transaction.get(clientRef);
      const visitCount = clientSnap.data()?.visitCount ?? 0;
      transaction.update(clientRef, {
        visitCount: visitCount + 1,
        lastVisitAt: FieldValue.serverTimestamp(),
      });
    }

    transaction.set(activeWaitingRef, {
      entryId,
      createdAt: FieldValue.serverTimestamp(),
    });

    transaction.set(queueRef.doc(entryId), {
      clientId,
      clientName,
      clientWhatsapp,
      status: "waiting",
      position: nextPosition,
      ticketNumber: nextTicket,
      estimatedWaitMin: estimateWaitMin(nextPosition, avgServiceTimeMin),
      publicToken,
      createdAt: FieldValue.serverTimestamp(),
    });

    transaction.set(
      counterRef,
      { lastPosition: nextPosition, lastTicket: nextTicket },
      { merge: true },
    );
  });

  await db.doc(`publicQueue/${publicToken}`).set(
    buildPublicQueuePayload(
      publicToken,
      company,
      { id: entryId, clientId, clientName, status: "waiting" },
      nextPosition,
    ),
  );

  return entryId;
}

export async function updateQueueStatusServer(
  db: Firestore,
  companyId: string,
  entryId: string,
  status: QueueStatus,
): Promise<void> {
  const company = await loadCompanyServer(db, companyId);
  assertCanOperateQueue(company);

  const ref = db.doc(`companies/${companyId}/queue/${entryId}`);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Entrada da fila não encontrada.");

  const data = snap.data()!;
  const clientId = data.clientId as string | undefined;
  const publicToken = data.publicToken as string | undefined;

  const payload: Record<string, unknown> = { status };

  if (status === "in_service") {
    payload.startedAt = FieldValue.serverTimestamp();
  }
  if (status === "completed") {
    payload.completedAt = FieldValue.serverTimestamp();
  }

  await ref.update(payload);

  if (clientId && status === "in_service") {
    await db.doc(`companies/${companyId}/activeWaiting/${clientId}`).delete();
  }

  if (publicToken) {
    if (status === "completed") {
      await db.doc(`publicQueue/${publicToken}`).update({
        status: "completed",
        position: 0,
        estimatedWaitMin: 0,
        updatedAt: FieldValue.serverTimestamp(),
      });
      await incrementAnalyticsOnCompleteServer(db, companyId, data);
      if (clientId) {
        await appendClientVisit(db, {
          companyId,
          clientId,
          entryId,
          status: "completed",
        });
      }
    } else {
      await db.doc(`publicQueue/${publicToken}`).update({
        status,
        position: status === "in_service" ? 0 : data.position,
        estimatedWaitMin: status === "in_service" ? 0 : data.estimatedWaitMin,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  }
}

export async function getMonthlyCompletionCountForCompany(
  db: Firestore,
  companyId: string,
): Promise<number> {
  return getMonthlyCompletionCountServer(db, companyId);
}
