import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  type Unsubscribe,
  onSnapshot,
} from "firebase/firestore";
import { ensureDb, getDb } from "@/lib/firebase/config";
import { mapQueueEntry, mapQueueVacancy } from "@/lib/firebase/mappers";
import {
  getCompany,
  syncPublicQueueSnapshots,
} from "@/lib/firebase/firestore";
import type {
  Company,
  QueueEntry,
  QueueVacancy,
  VacancyReason,
} from "@/lib/types";

function vacancyRef(companyId: string) {
  return doc(getDb(), "companies", companyId, "meta", "vacancy");
}

const OFFER_TIMEOUT_MS = 3 * 60 * 1000;

export async function getQueueVacancy(
  companyId: string,
): Promise<QueueVacancy | null> {
  await ensureDb();
  const snap = await getDoc(vacancyRef(companyId));
  return mapQueueVacancy(snap);
}

export function subscribeQueueVacancy(
  companyId: string,
  callback: (vacancy: QueueVacancy | null) => void,
): Unsubscribe {
  return onSnapshot(vacancyRef(companyId), (snap) => {
    callback(mapQueueVacancy(snap));
  });
}

async function listWaitingEntries(companyId: string): Promise<QueueEntry[]> {
  const db = await ensureDb();
  const snap = await getDocs(
    query(
      collection(db, "companies", companyId, "queue"),
      where("status", "==", "waiting"),
      orderBy("position", "asc"),
    ),
  );
  return snap.docs.map(mapQueueEntry);
}

async function clearSpotOfferFromPublicQueue(publicToken: string): Promise<void> {
  const db = await ensureDb();
  await updateDoc(doc(db, "publicQueue", publicToken), {
    spotOffer: deleteField(),
    updatedAt: serverTimestamp(),
  });
}

export async function promoteEntryToFront(
  companyId: string,
  entryId: string,
  waitingEntries: QueueEntry[],
): Promise<void> {
  const db = await ensureDb();
  const minPosition = Math.min(...waitingEntries.map((e) => e.position));
  await updateDoc(doc(db, "companies", companyId, "queue", entryId), {
    position: minPosition - 1,
  });
}

async function closeVacancyInternal(
  companyId: string,
  filledEntryId?: string,
): Promise<void> {
  await ensureDb();
  const vacancy = await getQueueVacancy(companyId);
  if (vacancy?.currentOffer?.publicToken) {
    await clearSpotOfferFromPublicQueue(vacancy.currentOffer.publicToken).catch(
      () => undefined,
    );
  }

  await setDoc(
    vacancyRef(companyId),
    {
      active: false,
      currentOffer: deleteField(),
      filledEntryId: filledEntryId ?? deleteField(),
      closedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function openQueueVacancy(
  companyId: string,
  reason: VacancyReason,
  removedEntryId?: string,
): Promise<void> {
  await ensureDb();
  const vacancyId = crypto.randomUUID();
  await setDoc(vacancyRef(companyId), {
    active: true,
    id: vacancyId,
    createdAt: serverTimestamp(),
    reason,
    removedEntryId: removedEntryId ?? null,
    declinedEntryIds: [],
    currentOffer: null,
    filledEntryId: null,
    closedAt: null,
  });

  const company = await getCompany(companyId);
  if (!company) return;

  await offerSpotToNextWaiting(companyId, company);
}

export async function offerSpotToNextWaiting(
  companyId: string,
  company?: Company | null,
): Promise<boolean> {
  const db = await ensureDb();
  const resolvedCompany = company ?? (await getCompany(companyId));
  if (!resolvedCompany) return false;

  const vacancy = await getQueueVacancy(companyId);
  if (!vacancy?.active) return false;

  const waiting = await listWaitingEntries(companyId);
  const declined = new Set(vacancy.declinedEntryIds ?? []);
  const currentOfferEntryId = vacancy.currentOffer?.entryId;

  const candidate = waiting.find(
    (entry) =>
      !declined.has(entry.id) &&
      entry.id !== currentOfferEntryId &&
      entry.publicToken,
  );

  if (!candidate?.publicToken) {
    if (vacancy.currentOffer?.publicToken) {
      await clearSpotOfferFromPublicQueue(vacancy.currentOffer.publicToken);
    }
    await updateDoc(vacancyRef(companyId), { currentOffer: deleteField() });
    return false;
  }

  if (vacancy.currentOffer?.publicToken && vacancy.currentOffer.publicToken !== candidate.publicToken) {
    await clearSpotOfferFromPublicQueue(vacancy.currentOffer.publicToken);
  }

  const offeredAt = new Date();
  const expiresAt = new Date(offeredAt.getTime() + OFFER_TIMEOUT_MS);
  const vacancyId = (await getDoc(vacancyRef(companyId))).data()?.id as string | undefined;

  await updateDoc(vacancyRef(companyId), {
    currentOffer: {
      entryId: candidate.id,
      publicToken: candidate.publicToken,
      clientName: candidate.clientName,
      offeredAt: Timestamp.fromDate(offeredAt),
      expiresAt: Timestamp.fromDate(expiresAt),
    },
  });

  await updateDoc(doc(db, "companies", companyId, "queue", candidate.id), {
    spotOfferStatus: "pending",
  });

  await updateDoc(doc(db, "publicQueue", candidate.publicToken), {
    spotOffer: {
      vacancyId: vacancyId ?? companyId,
      status: "pending",
      expiresAt: Timestamp.fromDate(expiresAt),
    },
    updatedAt: serverTimestamp(),
  });

  return true;
}

async function fillVacancyWithEntry(
  companyId: string,
  entryId: string,
  company: Company,
): Promise<void> {
  const db = await ensureDb();
  let waiting = await listWaitingEntries(companyId);
  await promoteEntryToFront(companyId, entryId, waiting);

  waiting = await listWaitingEntries(companyId);
  const entry = waiting.find((e) => e.id === entryId);
  if (entry?.publicToken) {
    await clearSpotOfferFromPublicQueue(entry.publicToken);
    await updateDoc(doc(db, "companies", companyId, "queue", entryId), {
      spotOfferStatus: "accepted",
    });
  }

  await closeVacancyInternal(companyId, entryId);
  await syncPublicQueueSnapshots(companyId, waiting, company, { skipVacancyCheck: true });
}

export async function respondToSpotOffer(
  token: string,
  accept: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const db = await ensureDb();
  const publicSnap = await getDoc(doc(db, "publicQueue", token));
  if (!publicSnap.exists()) {
    return { ok: false, error: "Link inválido." };
  }

  const publicData = publicSnap.data();
  const spotOffer = publicData.spotOffer as
    | { vacancyId?: string; status?: string; expiresAt?: Timestamp }
    | undefined;

  if (spotOffer?.status !== "pending") {
    return { ok: false, error: "Nenhuma oferta pendente." };
  }

  const companyId = publicData.companyId as string;
  const entryId = publicData.entryId as string;
  const vacancy = await getQueueVacancy(companyId);

  if (!vacancy?.active || vacancy.currentOffer?.publicToken !== token) {
    return { ok: false, error: "Oferta expirada ou inválida." };
  }

  const company = await getCompany(companyId);
  if (!company) return { ok: false, error: "Empresa não encontrada." };

  if (accept) {
    await fillVacancyWithEntry(companyId, entryId, company);
    return { ok: true };
  }

  const declinedEntryIds = [...(vacancy.declinedEntryIds ?? []), entryId];
  await updateDoc(doc(db, "companies", companyId, "queue", entryId), {
    spotOfferStatus: "declined",
  });
  await clearSpotOfferFromPublicQueue(token);

  await updateDoc(vacancyRef(companyId), {
    declinedEntryIds,
    currentOffer: deleteField(),
  });

  await offerSpotToNextWaiting(companyId, company);
  const waiting = await listWaitingEntries(companyId);
  await syncPublicQueueSnapshots(companyId, waiting, company);

  return { ok: true };
}

export async function assignVacancyManually(
  companyId: string,
  entryId: string,
): Promise<void> {
  const company = await getCompany(companyId);
  if (!company) throw new Error("Empresa não encontrada.");

  const vacancy = await getQueueVacancy(companyId);
  if (!vacancy?.active) throw new Error("Nenhuma vaga aberta.");

  await fillVacancyWithEntry(companyId, entryId, company);
}

export async function closeVacancy(companyId: string): Promise<void> {
  const company = await getCompany(companyId);
  await closeVacancyInternal(companyId);

  if (company) {
    const waiting = await listWaitingEntries(companyId);
    await syncPublicQueueSnapshots(companyId, waiting, company, {
      skipVacancyCheck: true,
    });
  }
}

export async function removeQueueEntryAndOpenVacancy(
  companyId: string,
  entry: QueueEntry,
  company: Company,
  remainingWaiting: QueueEntry[],
  reason: VacancyReason,
  publicStatus: "expired" | "cancelled" = "expired",
): Promise<void> {
  const db = await ensureDb();

  if (entry.publicToken) {
    await updateDoc(doc(db, "publicQueue", entry.publicToken), {
      status: publicStatus,
      spotOffer: deleteField(),
      updatedAt: serverTimestamp(),
    });
  }

  await deleteDoc(doc(db, "companies", companyId, "queue", entry.id));

  if (entry.clientId) {
    await deleteDoc(doc(db, "companies", companyId, "activeWaiting", entry.clientId));
  }

  const rest = remainingWaiting.filter((e) => e.id !== entry.id);
  if (rest.length > 0) {
    await syncPublicQueueSnapshots(companyId, rest, company, { deferTolerance: true });
  }

  await openQueueVacancy(companyId, reason, entry.id);
}

export async function markNoShow(
  companyId: string,
  entryId: string,
): Promise<void> {
  const company = await getCompany(companyId);
  if (!company) throw new Error("Empresa não encontrada.");

  const waiting = await listWaitingEntries(companyId);
  const entry = waiting.find((e) => e.id === entryId);
  if (!entry) throw new Error("Entrada não encontrada.");

  await removeQueueEntryAndOpenVacancy(
    companyId,
    entry,
    company,
    waiting,
    "no_show",
    "expired",
  );
}

/** Cliente público: marca cancelled no link; Cloud Function completa remoção da fila. */
export async function withdrawFromQueue(
  token: string,
): Promise<{ ok: boolean; error?: string; alreadyCancelled?: boolean }> {
  const db = await ensureDb();
  const publicSnap = await getDoc(doc(db, "publicQueue", token));
  if (!publicSnap.exists()) {
    return { ok: false, error: "Link inválido." };
  }

  const publicData = publicSnap.data();
  const status = publicData.status as string;

  if (status === "cancelled") {
    return { ok: true, alreadyCancelled: true };
  }

  if (status !== "waiting") {
    return { ok: false, error: "Não é possível desmarcar neste momento." };
  }

  const publicRef = doc(db, "publicQueue", token);
  try {
    await updateDoc(publicRef, {
      status: "cancelled",
      spotOffer: deleteField(),
      updatedAt: serverTimestamp(),
    });
    return { ok: true };
  } catch (err) {
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code: string }).code)
        : "";
    if (process.env.NODE_ENV === "development") {
      console.error("[withdrawFromQueue]", code || err);
    }
    if (code === "permission-denied") {
      return {
        ok: false,
        error: "Permissão negada — contate o estabelecimento.",
      };
    }
    return { ok: false, error: "Não foi possível desmarcar. Tente novamente." };
  }
}

export async function isVacancyBlockingTolerance(
  companyId: string,
): Promise<boolean> {
  const vacancy = await getQueueVacancy(companyId);
  return vacancy?.active === true && !vacancy.filledEntryId;
}
