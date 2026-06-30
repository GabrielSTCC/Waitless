import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  type Unsubscribe,
  onSnapshot,
} from "firebase/firestore";
import {
  assertMonthlyCompletionAllowed,
  assertStaffInviteAllowed,
} from "@/lib/billing/plan-limits";
import { assertCanOperateQueue, TrialExpiredError } from "@/lib/billing/trial";
import { getMonthlyCompletionCount } from "@/lib/billing/usage";
import { acceptInviteViaApi } from "@/lib/invites/accept-invite-client";
import {
  removeMemberViaApi,
  updateCompanyViaApi,
  updateMemberRoleViaApi,
} from "@/lib/company/company-settings-client";
import { ensureDb, getDb } from "@/lib/firebase/config";
export { PlanLimitError } from "@/lib/billing/plan-limits";
export { TrialExpiredError } from "@/lib/billing/trial";
import {
  CompanyNameTakenError,
  slugFromCompanyName,
  validateCompanySlug,
} from "@/lib/utils/company-slug";
import {
  mapClient,
  mapCompany,
  mapPublicQueueSnapshot,
  mapQueueEntry,
} from "@/lib/firebase/mappers";
import { ClientAlreadyInQueueError } from "@/lib/errors/queue";
import { normalizeName, normalizeWhatsapp } from "@/lib/utils/format";
import { buildPublicQueueCompanyFields } from "@/lib/queue/public-queue-company-fields";
import { estimateWaitMin } from "@/lib/utils/queue-estimate";
import { computeQueueRanks } from "@/lib/utils/queue-rank";
import { normalizeRole, type InviteRole } from "@/lib/permissions";
import type {
  Client,
  Company,
  CompanyBrand,
  CompanyLegal,
  CompanyMember,
  MemberRole,
  PublicQueueSnapshot,
  QueueEntry,
  QueueStatus,
} from "@/lib/types";

function buildPublicQueuePayload(
  token: string,
  company: Company,
  entry: QueueEntry,
  displayPosition: number,
  options?: { merge?: boolean },
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    companyId: company.id,
    entryId: entry.id,
    status: entry.status,
    position: displayPosition,
    ...buildPublicQueueCompanyFields(company, displayPosition),
    clientName: entry.clientName,
    clientId: entry.clientId,
    updatedAt: serverTimestamp(),
  };

  if (entry.toleranceExpiresAt) {
    payload.toleranceExpiresAt = Timestamp.fromDate(entry.toleranceExpiresAt);
  } else if (options?.merge) {
    // deleteField() is invalid on setDoc create — only use when merging updates.
    payload.toleranceExpiresAt = deleteField();
  }

  return payload;
}

export { ClientAlreadyInQueueError };

export async function getCompany(companyId: string): Promise<Company | null> {
  const snap = await getDoc(doc((await ensureDb()), "companies", companyId));
  if (!snap.exists()) return null;
  return mapCompany(snap);
}

export async function updateCompany(
  companyId: string,
  data: {
    name?: string;
    avgServiceTimeMin?: number;
    toleranceEnabled?: boolean;
    toleranceMin?: number;
    defaultLocale?: Company["defaultLocale"];
    brand?: CompanyBrand;
    legal?: CompanyLegal;
    contactWhatsapp?: string;
  },
): Promise<void> {
  await updateCompanyViaApi(companyId, data);
}

export async function searchClients(
  companyId: string,
  term: string,
  max = 8,
): Promise<Client[]> {
  const trimmed = term.trim();
  if (trimmed.length < 2) return [];

  const clientsRef = collection((await ensureDb()), "companies", companyId, "clients");
  const digits = normalizeWhatsapp(trimmed);

  if (digits.length >= 2) {
    const end = digits.slice(0, -1) + String.fromCharCode(digits.charCodeAt(digits.length - 1) + 1);
    const snap = await getDocs(
      query(
        clientsRef,
        where("normalizedWhatsapp", ">=", digits),
        where("normalizedWhatsapp", "<", end),
        limit(max),
      ),
    );
    if (!snap.empty) return snap.docs.map(mapClient);
  }

  const normalized = normalizeName(trimmed);
  const endName =
    normalized.slice(0, -1) +
    String.fromCharCode(normalized.charCodeAt(normalized.length - 1) + 1);

  const nameSnap = await getDocs(
    query(
      clientsRef,
      where("normalizedName", ">=", normalized),
      where("normalizedName", "<", endName),
      limit(max),
    ),
  );

  return nameSnap.docs.map(mapClient);
}

export async function listClients(
  companyId: string,
  max = 50,
): Promise<Client[]> {
  const clientsRef = collection((await ensureDb()), "companies", companyId, "clients");

  try {
    const snap = await getDocs(
      query(clientsRef, orderBy("lastVisitAt", "desc"), limit(max)),
    );
    return snap.docs.map(mapClient);
  } catch {
    const snap = await getDocs(query(clientsRef, limit(max)));
    return snap.docs
      .map(mapClient)
      .sort((a, b) => b.lastVisitAt.getTime() - a.lastVisitAt.getTime())
      .slice(0, max);
  }
}

export async function upsertClientAndAddToQueue(
  companyId: string,
  input: { name: string; whatsapp: string },
  avgServiceTimeMin: number,
): Promise<string> {
  const company = await getCompany(companyId);
  if (!company) throw new Error("Empresa não encontrada.");

  assertCanOperateQueue(company);

  const monthlyCount = await getMonthlyCompletionCount(companyId);
  assertMonthlyCompletionAllowed(company, monthlyCount);

  const clientsRef = collection((await ensureDb()), "companies", companyId, "clients");
  const normalizedWhatsapp = normalizeWhatsapp(input.whatsapp);
  const normalizedClientName = normalizeName(input.name);
  const queueRef = collection((await ensureDb()), "companies", companyId, "queue");

  const existingSnap = await getDocs(
    query(
      clientsRef,
      where("normalizedWhatsapp", "==", normalizedWhatsapp),
      limit(1),
    ),
  );

  let clientId: string;
  let clientName = input.name.trim();
  let clientWhatsapp = input.whatsapp.trim();
  let isExistingClient = false;

  if (!existingSnap.empty) {
    const existingDoc = existingSnap.docs[0];
    clientId = existingDoc.id;
    const data = existingDoc.data();
    clientName = data.name;
    clientWhatsapp = data.whatsapp;
    isExistingClient = true;
  } else {
    clientId = crypto.randomUUID();
    await setDoc(doc(clientsRef, clientId), {
      name: clientName,
      whatsapp: clientWhatsapp,
      normalizedWhatsapp,
      normalizedName: normalizedClientName,
      visitCount: 1,
      createdAt: serverTimestamp(),
      lastVisitAt: serverTimestamp(),
    });
  }

  const entryId = crypto.randomUUID();
  const publicToken = crypto.randomUUID();
  const activeWaitingRef = doc((await ensureDb()), "companies", companyId, "activeWaiting", clientId);
  const counterRef = doc((await ensureDb()), "companies", companyId, "meta", "queue");

  let nextPosition = 0;
  let nextTicket = 0;

  await runTransaction((await ensureDb()), async (transaction) => {
    const activeSnap = await transaction.get(activeWaitingRef);
    if (activeSnap.exists()) {
      throw new ClientAlreadyInQueueError(clientName);
    }

    const counterSnap = await transaction.get(counterRef);
    const lastPosition = counterSnap.data()?.lastPosition ?? 0;
    const lastTicket = counterSnap.data()?.lastTicket ?? 0;
    nextPosition = lastPosition + 1;
    nextTicket = lastTicket + 1;

    if (isExistingClient) {
      const clientRef = doc(clientsRef, clientId);
      const clientSnap = await transaction.get(clientRef);
      const visitCount = clientSnap.data()?.visitCount ?? 0;
      transaction.update(clientRef, {
        visitCount: visitCount + 1,
        lastVisitAt: serverTimestamp(),
      });
    }

    transaction.set(activeWaitingRef, {
      entryId,
      createdAt: serverTimestamp(),
    });

    transaction.set(doc(queueRef, entryId), {
      clientId,
      clientName,
      clientWhatsapp,
      status: "waiting" as QueueStatus,
      position: nextPosition,
      ticketNumber: nextTicket,
      estimatedWaitMin: estimateWaitMin(nextPosition, avgServiceTimeMin),
      publicToken,
      createdAt: serverTimestamp(),
    });

    transaction.set(
      counterRef,
      { lastPosition: nextPosition, lastTicket: nextTicket },
      { merge: true },
    );
  });

  const entry: QueueEntry = {
    id: entryId,
    clientId,
    clientName,
    clientWhatsapp,
    status: "waiting",
    position: nextPosition,
    ticketNumber: nextTicket,
    publicToken,
    createdAt: new Date(),
    estimatedWaitMin: estimateWaitMin(nextPosition, avgServiceTimeMin),
  };
  await setDoc(
    doc((await ensureDb()), "publicQueue", publicToken),
    buildPublicQueuePayload(publicToken, company, entry, nextPosition),
  );

  return entryId;
}

export async function updateQueueStatus(
  companyId: string,
  entryId: string,
  status: QueueStatus,
) {
  const company = await getCompany(companyId);
  assertCanOperateQueue(company);

  const ref = doc((await ensureDb()), "companies", companyId, "queue", entryId);
  const snap = await getDoc(ref);
  const data = snap.data();
  const clientId = data?.clientId as string | undefined;
  const publicToken = data?.publicToken as string | undefined;

  const payload: Record<string, unknown> = { status };

  if (status === "in_service") {
    payload.startedAt = serverTimestamp();
  }
  if (status === "completed") {
    payload.completedAt = serverTimestamp();
  }

  await updateDoc(ref, payload);

  if (clientId && status === "in_service") {
    await deleteDoc(doc((await ensureDb()), "companies", companyId, "activeWaiting", clientId));
  }

  if (publicToken) {
    if (status === "completed") {
      await updateDoc(doc((await ensureDb()), "publicQueue", publicToken), {
        status: "completed",
        position: 0,
        estimatedWaitMin: 0,
        updatedAt: serverTimestamp(),
      });
      await incrementAnalyticsOnComplete(companyId, data);
    } else {
      await updateDoc(doc((await ensureDb()), "publicQueue", publicToken), {
        status,
        position: status === "in_service" ? 0 : data?.position,
        estimatedWaitMin: status === "in_service" ? 0 : data?.estimatedWaitMin,
        updatedAt: serverTimestamp(),
      });
    }
  }
}

async function incrementAnalyticsOnComplete(
  companyId: string,
  entryData: Record<string, unknown> | undefined,
) {
  const analyticsRef = doc((await ensureDb()), "companies", companyId, "meta", "analytics");
  const createdAt = entryData?.createdAt as { toDate?: () => Date } | undefined;
  const waitMin =
    createdAt && typeof createdAt.toDate === "function"
      ? Math.max(0, Math.round((Date.now() - createdAt.toDate!().getTime()) / 60000))
      : 0;

  await runTransaction((await ensureDb()), async (transaction) => {
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
        lastUpdated: serverTimestamp(),
      },
      { merge: true },
    );
  });

}

export async function getAnalytics(companyId: string) {
  const snap = await getDoc(doc((await ensureDb()), "companies", companyId, "meta", "analytics"));
  const data = snap.data();
  return {
    totalServed: data?.totalServed ?? 0,
    totalServedToday: data?.totalServedToday ?? 0,
    avgWaitMinToday: data?.avgWaitMinToday ?? 0,
  };
}

export async function getCompletedEntriesSince(
  companyId: string,
  since: Date,
  max = 500,
): Promise<QueueEntry[]> {
  const snap = await getDocs(
    query(
      collection((await ensureDb()), "companies", companyId, "queue"),
      where("status", "==", "completed"),
      where("completedAt", ">=", Timestamp.fromDate(since)),
      orderBy("completedAt", "desc"),
      limit(max),
    ),
  );
  return snap.docs.map(mapQueueEntry);
}

export async function getClientsCount(companyId: string): Promise<number> {
  const snap = await getDocs(
    query(collection((await ensureDb()), "companies", companyId, "clients"), limit(1000)),
  );
  return snap.size;
}

export async function createStaffInvite(
  companyId: string,
  email: string,
  createdBy: string,
  companyName: string,
  role: InviteRole = "base",
): Promise<string> {
  const company = await getCompany(companyId);
  assertCanOperateQueue(company);

  const [members, pendingInvites] = await Promise.all([
    listCompanyMembers(companyId),
    listInvites(companyId),
  ]);
  assertStaffInviteAllowed(company, members.length + pendingInvites.length);

  const inviteId = crypto.randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await setDoc(doc((await ensureDb()), "invites", inviteId), {
    companyId,
    companyName: companyName.trim(),
    email: email.trim().toLowerCase(),
    role,
    createdBy,
    expiresAt: Timestamp.fromDate(expiresAt),
    used: false,
    createdAt: serverTimestamp(),
  });

  return inviteId;
}

export async function acceptInvite(inviteId: string, _userId: string, _email: string) {
  await acceptInviteViaApi(inviteId);
}

export async function listCompanyMembers(companyId: string): Promise<CompanyMember[]> {
  const snap = await getDocs(
    query(collection((await ensureDb()), "members"), where("companyId", "==", companyId), limit(50)),
  );
  return snap.docs.map((memberDoc) => ({
    userId: memberDoc.id,
    companyId: memberDoc.data().companyId as string,
    email: memberDoc.data().email as string,
    role: normalizeRole(memberDoc.data().role as string | undefined),
  }));
}

export async function updateMemberRole(
  userId: string,
  role: Extract<MemberRole, "admin" | "base">,
): Promise<void> {
  await updateMemberRoleViaApi(userId, role);
}

export async function removeMember(userId: string, companyOwnerId: string): Promise<void> {
  if (userId === companyOwnerId) {
    throw new Error("Não é possível remover o dono do estabelecimento.");
  }
  await removeMemberViaApi(userId, companyOwnerId);
}

export async function listInvites(companyId: string) {
  const snap = await getDocs(
    query(
      collection((await ensureDb()), "invites"),
      where("companyId", "==", companyId),
      where("used", "==", false),
      limit(20),
    ),
  );
  return snap.docs.map((d) => ({
    id: d.id,
    email: d.data().email as string,
    role: normalizeRole(d.data().role as string | undefined) as InviteRole,
    createdAt: d.data().createdAt?.toDate?.() as Date | undefined,
  }));
}

export async function removeQueueEntryDueToTolerance(
  companyId: string,
  entry: QueueEntry,
  company: Company,
  remainingWaiting: QueueEntry[],
): Promise<void> {
  const { removeQueueEntryAndOpenVacancy } = await import("@/lib/firebase/vacancy");
  await removeQueueEntryAndOpenVacancy(
    companyId,
    entry,
    company,
    remainingWaiting,
    "tolerance_expired",
    "expired",
  );
}

export async function syncPublicQueueSnapshots(
  companyId: string,
  waitingEntries: QueueEntry[],
  company: Company,
  options?: { deferTolerance?: boolean; skipVacancyCheck?: boolean },
): Promise<void> {
  let deferTolerance = options?.deferTolerance ?? false;

  if (!options?.skipVacancyCheck) {
    const { isVacancyBlockingTolerance } = await import("@/lib/firebase/vacancy");
    deferTolerance = deferTolerance || (await isVacancyBlockingTolerance(companyId));
  }

  const ranks = computeQueueRanks(waitingEntries);

  await Promise.all(
    waitingEntries.map(async (entry) => {
      if (!entry.publicToken) return;

      const rank = ranks.get(entry.id);
      if (!rank) return;

      let turnStartedAt = entry.turnStartedAt;
      let toleranceExpiresAt = entry.toleranceExpiresAt;
      const queueRef = doc((await ensureDb()), "companies", companyId, "queue", entry.id);

      if (company.toleranceEnabled && rank.isFirst && !deferTolerance) {
        if (!turnStartedAt) {
          turnStartedAt = new Date();
          toleranceExpiresAt = new Date(
            turnStartedAt.getTime() + company.toleranceMin * 60_000,
          );
          await updateDoc(queueRef, {
            turnStartedAt: Timestamp.fromDate(turnStartedAt),
            toleranceExpiresAt: Timestamp.fromDate(toleranceExpiresAt),
          });
        }
      } else if (turnStartedAt || toleranceExpiresAt) {
        if (deferTolerance || !rank.isFirst) {
          await updateDoc(queueRef, {
            turnStartedAt: deleteField(),
            toleranceExpiresAt: deleteField(),
          });
          turnStartedAt = undefined;
          toleranceExpiresAt = undefined;
        }
      }

      const syncedEntry: QueueEntry = {
        ...entry,
        turnStartedAt,
        toleranceExpiresAt,
      };

      const payload = buildPublicQueuePayload(
        entry.publicToken,
        company,
        syncedEntry,
        rank.displayPosition,
        { merge: true },
      );

      await setDoc(doc((await ensureDb()), "publicQueue", entry.publicToken), payload, {
        merge: true,
      });
    }),
  );
}

function markSnapshotConnected(onError?: (connected: boolean) => void): void {
  onError?.(true);
}

function markSnapshotDisconnected(_error: unknown, onError?: (connected: boolean) => void): void {
  onError?.(false);
}

export function subscribePublicQueue(
  token: string,
  callback: (snapshot: PublicQueueSnapshot | null) => void,
  onError?: (connected: boolean) => void,
): Unsubscribe {
  return onSnapshot(
    doc(getDb(), "publicQueue", token),
    (snap) => {
      markSnapshotConnected(onError);
      callback(snap.exists() ? mapPublicQueueSnapshot(snap) : null);
    },
    (error) => {
      markSnapshotDisconnected(error, onError);
      callback(null);
    },
  );
}

export function subscribeWaitingQueue(
  companyId: string,
  callback: (entries: QueueEntry[]) => void,
  onError?: (connected: boolean) => void,
): Unsubscribe {
  const q = query(
    collection(getDb(), "companies", companyId, "queue"),
    where("status", "==", "waiting"),
    orderBy("position", "asc"),
  );

  return onSnapshot(
    q,
    (snap) => {
      markSnapshotConnected(onError);
      callback(snap.docs.map(mapQueueEntry));
    },
    (error) => markSnapshotDisconnected(error, onError),
  );
}

export function subscribeInServiceQueue(
  companyId: string,
  callback: (entries: QueueEntry[]) => void,
  onError?: (connected: boolean) => void,
): Unsubscribe {
  const q = query(
    collection(getDb(), "companies", companyId, "queue"),
    where("status", "==", "in_service"),
    orderBy("startedAt", "asc"),
  );

  return onSnapshot(
    q,
    (snap) => {
      markSnapshotConnected(onError);
      callback(snap.docs.map(mapQueueEntry));
    },
    (error) => markSnapshotDisconnected(error, onError),
  );
}

export async function addExistingClientToQueue(
  companyId: string,
  client: Client,
  avgServiceTimeMin: number,
) {
  await upsertClientAndAddToQueue(
    companyId,
    { name: client.name, whatsapp: client.whatsapp },
    avgServiceTimeMin,
  );
}
