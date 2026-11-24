/**
 * Leituras + listeners Firestore no browser.
 * Mutações de fila/vaga/clientes: lib/queue + lib/clients (Admin SDK via API).
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  where,
  type Unsubscribe,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { acceptInviteViaApi } from "@/lib/invites/accept-invite-client";
import { enableAreaGuideAuto } from "@/lib/admin/area-guide";
import {
  removeMemberViaApi,
  updateCompanyViaApi,
  updateMemberRoleViaApi,
} from "@/lib/company/company-settings-client";
import { ensureDb, getDb } from "@/lib/firebase/config";
export { PlanLimitError } from "@/lib/billing/plan-limits";
export { TrialExpiredError } from "@/lib/billing/trial";
export { ClientAlreadyInQueueError } from "@/lib/errors/queue";
import {
  mapCompany,
  mapPublicQueueSnapshot,
  mapQueueEntry,
} from "@/lib/firebase/mappers";
import { normalizeRole, type InviteRole } from "@/lib/permissions";
import type {
  Company,
  CompanyBrand,
  CompanyLegal,
  CompanyMember,
  MemberRole,
  PublicQueueSnapshot,
  QueueEntry,
  ServiceMode,
  BusinessHours,
} from "@/lib/types";

export {
  searchClients,
  listClients,
  getClientsCount,
} from "@/lib/clients/clients-read";

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
    appointmentsEnabled?: boolean;
    serviceMode?: ServiceMode;
    reminderLeadMin?: number;
    businessHours?: BusinessHours;
  },
): Promise<void> {
  await updateCompanyViaApi(companyId, data);
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

export async function acceptInvite(inviteId: string, userId: string, _email: string) {
  await acceptInviteViaApi(inviteId);
  enableAreaGuideAuto(userId);
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

function markSnapshotConnected(onError?: (connected: boolean) => void): void {
  onError?.(true);
}

function markSnapshotDisconnected(
  _error: unknown,
  onError?: (connected: boolean) => void,
): void {
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
