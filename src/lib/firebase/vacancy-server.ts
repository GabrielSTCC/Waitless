import {
  FieldValue,
  Timestamp,
  type Firestore,
} from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { appendClientVisit } from "@/lib/firebase/client-visits-server";

const OFFER_TIMEOUT_MS = 3 * 60 * 1000;

type VacancyReason =
  | "tolerance_expired"
  | "no_show"
  | "manual"
  | "client_cancelled";

interface WaitingEntryRow {
  id: string;
  clientId?: string;
  clientName: string;
  publicToken?: string;
  position: number;
}

async function listWaiting(db: Firestore, companyId: string): Promise<WaitingEntryRow[]> {
  const snap = await db
    .collection(`companies/${companyId}/queue`)
    .where("status", "==", "waiting")
    .orderBy("position", "asc")
    .get();
  return snap.docs.map((d) => ({
    id: d.id,
    clientId: d.data().clientId as string | undefined,
    clientName: (d.data().clientName as string) ?? "",
    publicToken: d.data().publicToken as string | undefined,
    position: d.data().position as number,
  }));
}

async function getVacancy(db: Firestore, companyId: string) {
  const snap = await db.doc(`companies/${companyId}/meta/vacancy`).get();
  if (!snap.exists) return null;
  const data = snap.data()!;
  return {
    active: data.active === true,
    declinedEntryIds: (data.declinedEntryIds as string[]) ?? [],
    currentOffer: data.currentOffer as
      | {
          entryId: string;
          publicToken: string;
          clientName: string;
        }
      | undefined,
    filledEntryId: data.filledEntryId as string | undefined,
    id: data.id as string | undefined,
  };
}

async function clearSpotOffer(db: Firestore, publicToken: string) {
  await db.doc(`publicQueue/${publicToken}`).update({
    spotOffer: FieldValue.delete(),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

async function closeVacancyInternal(
  db: Firestore,
  companyId: string,
  filledEntryId?: string,
) {
  const vacancy = await getVacancy(db, companyId);
  if (vacancy?.currentOffer?.publicToken) {
    await clearSpotOffer(db, vacancy.currentOffer.publicToken).catch(() => undefined);
  }
  await db.doc(`companies/${companyId}/meta/vacancy`).set(
    {
      active: false,
      currentOffer: FieldValue.delete(),
      filledEntryId: filledEntryId ?? FieldValue.delete(),
      closedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

async function promoteEntryToFront(
  db: Firestore,
  companyId: string,
  entryId: string,
  waiting: WaitingEntryRow[],
) {
  const minPosition = Math.min(...waiting.map((e) => e.position));
  await db.doc(`companies/${companyId}/queue/${entryId}`).update({
    position: minPosition - 1,
  });
}

function estimateWaitMin(position: number, avg: number) {
  return Math.max(0, position - 1) * avg;
}

async function syncSnapshots(
  db: Firestore,
  companyId: string,
  deferTolerance: boolean,
) {
  const companySnap = await db.doc(`companies/${companyId}`).get();
  if (!companySnap.exists) return;
  const company = companySnap.data()!;
  const toleranceEnabled = company.toleranceEnabled === true;
  const toleranceMin = (company.toleranceMin as number) ?? 5;
  const avg = (company.avgServiceTimeMin as number) ?? 10;

  const waiting = await listWaiting(db, companyId);
  const sorted = [...waiting].sort((a, b) => a.position - b.position);

  await Promise.all(
    sorted.map(async (entry, index) => {
      if (!entry.publicToken) return;
      const isFirst = index === 0;
      const displayPosition = index + 1;
      const queueRef = db.doc(`companies/${companyId}/queue/${entry.id}`);
      const queueSnap = await queueRef.get();
      const queueData = queueSnap.data() ?? {};

      let turnStartedAt = queueData.turnStartedAt as Timestamp | undefined;
      let toleranceExpiresAt = queueData.toleranceExpiresAt as Timestamp | undefined;

      if (toleranceEnabled && isFirst && !deferTolerance) {
        if (!turnStartedAt) {
          turnStartedAt = Timestamp.now();
          toleranceExpiresAt = Timestamp.fromMillis(
            turnStartedAt.toMillis() + toleranceMin * 60_000,
          );
          await queueRef.update({ turnStartedAt, toleranceExpiresAt });
        }
      } else if (turnStartedAt || toleranceExpiresAt) {
        await queueRef.update({
          turnStartedAt: FieldValue.delete(),
          toleranceExpiresAt: FieldValue.delete(),
        });
        turnStartedAt = undefined;
        toleranceExpiresAt = undefined;
      }

      const payload: Record<string, unknown> = {
        companyId,
        entryId: entry.id,
        status: "waiting",
        position: displayPosition,
        estimatedWaitMin: estimateWaitMin(displayPosition, avg),
        companyName: company.name,
        companyTagline: (company.brand as { tagline?: string })?.tagline ?? "",
        avgServiceTimeMin: avg,
        toleranceEnabled,
        toleranceMin,
        brandAccent: (company.brand as { accentColor?: string })?.accentColor ?? "#FF6600",
        brandLogoUrl: (company.brand as { logoUrl?: string })?.logoUrl ?? "",
        locale: company.defaultLocale === "en" ? "en" : "pt-BR",
        clientName: entry.clientName,
        companyContactWhatsapp: (company.contactWhatsapp as string) ?? "",
        updatedAt: FieldValue.serverTimestamp(),
      };

      if (toleranceExpiresAt) {
        payload.toleranceExpiresAt = toleranceExpiresAt;
      } else {
        payload.toleranceExpiresAt = FieldValue.delete();
      }

      await db.doc(`publicQueue/${entry.publicToken}`).set(payload, { merge: true });
    }),
  );
}

async function fillVacancyWithEntry(
  db: Firestore,
  companyId: string,
  entryId: string,
) {
  let waiting = await listWaiting(db, companyId);
  await promoteEntryToFront(db, companyId, entryId, waiting);
  waiting = await listWaiting(db, companyId);
  const entry = waiting.find((e) => e.id === entryId);
  if (entry?.publicToken) {
    await clearSpotOffer(db, entry.publicToken);
    await db.doc(`companies/${companyId}/queue/${entryId}`).update({
      spotOfferStatus: "accepted",
    });
  }
  await closeVacancyInternal(db, companyId, entryId);
  await syncSnapshots(db, companyId, false);
}

async function offerSpotToNextWaiting(db: Firestore, companyId: string) {
  const vacancy = await getVacancy(db, companyId);
  if (!vacancy?.active) return false;

  const waiting = await listWaiting(db, companyId);
  const declined = new Set(vacancy.declinedEntryIds);
  const currentOfferEntryId = vacancy.currentOffer?.entryId;

  const candidate = waiting.find(
    (e) => !declined.has(e.id) && e.id !== currentOfferEntryId && e.publicToken,
  );

  if (!candidate?.publicToken) {
    if (vacancy.currentOffer?.publicToken) {
      await clearSpotOffer(db, vacancy.currentOffer.publicToken);
    }
    await db.doc(`companies/${companyId}/meta/vacancy`).update({
      currentOffer: FieldValue.delete(),
    });
    return false;
  }

  if (
    vacancy.currentOffer?.publicToken &&
    vacancy.currentOffer.publicToken !== candidate.publicToken
  ) {
    await clearSpotOffer(db, vacancy.currentOffer.publicToken);
  }

  const offeredAt = new Date();
  const expiresAt = new Date(offeredAt.getTime() + OFFER_TIMEOUT_MS);

  await db.doc(`companies/${companyId}/meta/vacancy`).update({
    currentOffer: {
      entryId: candidate.id,
      publicToken: candidate.publicToken,
      clientName: candidate.clientName,
      offeredAt: Timestamp.fromDate(offeredAt),
      expiresAt: Timestamp.fromDate(expiresAt),
    },
  });

  await db.doc(`companies/${companyId}/queue/${candidate.id}`).update({
    spotOfferStatus: "pending",
  });

  await db.doc(`publicQueue/${candidate.publicToken}`).update({
    spotOffer: {
      vacancyId: vacancy.id ?? companyId,
      status: "pending",
      expiresAt: Timestamp.fromDate(expiresAt),
    },
    updatedAt: FieldValue.serverTimestamp(),
  });

  return true;
}

async function openQueueVacancy(
  db: Firestore,
  companyId: string,
  reason: VacancyReason,
  removedEntryId?: string,
) {
  await db.doc(`companies/${companyId}/meta/vacancy`).set({
    active: true,
    id: crypto.randomUUID(),
    createdAt: FieldValue.serverTimestamp(),
    reason,
    removedEntryId: removedEntryId ?? null,
    declinedEntryIds: [],
    currentOffer: null,
    filledEntryId: null,
    closedAt: null,
  });
  await offerSpotToNextWaiting(db, companyId);
}

export async function respondToSpotOfferServer(
  token: string,
  accept: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const db = getAdminDb();
  const publicSnap = await db.doc(`publicQueue/${token}`).get();
  if (!publicSnap.exists) return { ok: false, error: "Link inválido." };

  const publicData = publicSnap.data()!;
  const spotOffer = publicData.spotOffer as { status?: string } | undefined;
  if (spotOffer?.status !== "pending") {
    return { ok: false, error: "Nenhuma oferta pendente." };
  }

  const companyId = publicData.companyId as string;
  const entryId = publicData.entryId as string;
  const vacancy = await getVacancy(db, companyId);

  if (!vacancy?.active || vacancy.currentOffer?.publicToken !== token) {
    return { ok: false, error: "Oferta expirada ou inválida." };
  }

  if (accept) {
    await fillVacancyWithEntry(db, companyId, entryId);
    return { ok: true };
  }

  const declinedEntryIds = [...vacancy.declinedEntryIds, entryId];
  await db.doc(`companies/${companyId}/queue/${entryId}`).update({
    spotOfferStatus: "declined",
  });
  await clearSpotOffer(db, token);
  await db.doc(`companies/${companyId}/meta/vacancy`).update({
    declinedEntryIds,
    currentOffer: FieldValue.delete(),
  });
  await offerSpotToNextWaiting(db, companyId);
  await syncSnapshots(db, companyId, true);
  return { ok: true };
}

export async function withdrawFromQueueServer(
  token: string,
): Promise<{ ok: boolean; error?: string; alreadyCancelled?: boolean }> {
  const db = getAdminDb();
  const publicSnap = await db.doc(`publicQueue/${token}`).get();
  if (!publicSnap.exists) return { ok: false, error: "Link inválido." };

  const publicData = publicSnap.data()!;
  const status = publicData.status as string;

  if (status === "cancelled") return { ok: true, alreadyCancelled: true };
  if (status !== "waiting") {
    return { ok: false, error: "Não é possível desmarcar neste momento." };
  }

  const companyId = publicData.companyId as string;
  const entryId = publicData.entryId as string;
  const position = (publicData.position as number) ?? 0;
  const spotOffer = publicData.spotOffer as { status?: string } | undefined;
  const hadPendingOffer = spotOffer?.status === "pending";
  const wasFirst = position === 1;

  const waiting = await listWaiting(db, companyId);
  const entry = waiting.find((e) => e.id === entryId);

  const vacancy = await getVacancy(db, companyId);
  if (vacancy?.currentOffer?.publicToken === token) {
    await db.doc(`companies/${companyId}/meta/vacancy`).update({
      currentOffer: FieldValue.delete(),
    });
  }

  await db.doc(`publicQueue/${token}`).update({
    status: "cancelled",
    spotOffer: FieldValue.delete(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  if (entry) {
    await db.doc(`companies/${companyId}/queue/${entry.id}`).delete();
    if (entry.clientId) {
      await db.doc(`companies/${companyId}/activeWaiting/${entry.clientId}`).delete();
      await appendClientVisit(db, {
        companyId,
        clientId: entry.clientId,
        entryId,
        status: "cancelled",
      });
    }
  }

  const rest = waiting.filter((e) => e.id !== entryId);
  if (rest.length > 0) {
    await syncSnapshots(db, companyId, wasFirst || hadPendingOffer);
  }

  if (wasFirst || hadPendingOffer) {
    await openQueueVacancy(db, companyId, "client_cancelled", entryId);
  }

  return { ok: true };
}

export async function removeEntryAndOpenVacancyServer(
  db: Firestore,
  companyId: string,
  entryId: string,
  entryData: Record<string, unknown>,
  reason: VacancyReason,
  publicStatus: "expired" | "cancelled",
) {
  const publicToken = entryData.publicToken as string | undefined;
  const clientId = entryData.clientId as string | undefined;

  if (publicToken) {
    await db.doc(`publicQueue/${publicToken}`).update({
      status: publicStatus,
      spotOffer: FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  await db.doc(`companies/${companyId}/queue/${entryId}`).delete();
  if (clientId) {
    await db.doc(`companies/${companyId}/activeWaiting/${clientId}`).delete();
    await appendClientVisit(db, {
      companyId,
      clientId,
      entryId,
      status: publicStatus,
    });
  }

  const waiting = await listWaiting(db, companyId);
  if (waiting.length > 0) {
    await syncSnapshots(db, companyId, true);
  }

  await openQueueVacancy(db, companyId, reason, entryId);
}
