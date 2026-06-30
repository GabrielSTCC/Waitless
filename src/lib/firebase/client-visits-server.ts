import { Timestamp, type Firestore } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import type {
  AppendClientVisitParams,
  ClientVisit,
  TerminalVisitStatus,
} from "@/lib/client/visit-log";
import type { PublicQueueStatus } from "@/lib/types";

function visitRef(db: Firestore, companyId: string, clientId: string, entryId: string) {
  return db.doc(`companies/${companyId}/clients/${clientId}/visits/${entryId}`);
}

export async function appendClientVisit(
  db: Firestore,
  params: AppendClientVisitParams,
): Promise<void> {
  const { companyId, clientId, entryId, status, occurredAt = new Date() } = params;
  if (!companyId || !clientId || !entryId) return;

  await visitRef(db, companyId, clientId, entryId).set(
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

export async function listClientVisits(
  db: Firestore,
  companyId: string,
  clientId: string,
  limit = 10,
): Promise<ClientVisit[]> {
  const snap = await db
    .collection(`companies/${companyId}/clients/${clientId}/visits`)
    .orderBy("occurredAt", "desc")
    .limit(limit)
    .get();

  return snap.docs.map((doc) => {
    const data = doc.data();
    const occurredAt = data.occurredAt as Timestamp | undefined;
    return {
      visitId: doc.id,
      entryId: (data.entryId as string) ?? doc.id,
      status: data.status as TerminalVisitStatus,
      occurredAt: occurredAt?.toDate() ?? new Date(),
      companyId: data.companyId as string,
      clientId: data.clientId as string,
    };
  });
}

export interface PublicTokenContext {
  companyId: string;
  entryId: string;
  clientId: string;
  status: PublicQueueStatus;
  clientName?: string;
  companyName?: string;
  locale?: "pt-BR" | "en";
}

export async function resolvePublicTokenContext(
  token: string,
): Promise<PublicTokenContext | null> {
  const db = getAdminDb();
  const publicSnap = await db.doc(`publicQueue/${token}`).get();
  if (!publicSnap.exists) return null;

  const data = publicSnap.data()!;
  const companyId = data.companyId as string;
  const entryId = data.entryId as string;
  let clientId = data.clientId as string | undefined;

  if (!clientId && entryId) {
    const entrySnap = await db.doc(`companies/${companyId}/queue/${entryId}`).get();
    if (entrySnap.exists) {
      clientId = entrySnap.data()?.clientId as string | undefined;
    }
  }

  if (!clientId) return null;

  return {
    companyId,
    entryId,
    clientId,
    status: data.status as PublicQueueStatus,
    clientName: data.clientName as string | undefined,
    companyName: data.companyName as string | undefined,
    locale: data.locale === "en" ? "en" : "pt-BR",
  };
}

export async function listClientVisitsForToken(
  token: string,
): Promise<{ visits: ClientVisit[]; activeEntryId: string | null } | null> {
  const ctx = await resolvePublicTokenContext(token);
  if (!ctx) return null;

  const db = getAdminDb();
  const visits = await listClientVisits(db, ctx.companyId, ctx.clientId, 10);
  const isActive = ctx.status === "waiting" || ctx.status === "in_service";
  const filtered = isActive
    ? visits.filter((v) => v.visitId !== ctx.entryId)
    : visits;

  return {
    visits: filtered,
    activeEntryId: isActive ? ctx.entryId : null,
  };
}
