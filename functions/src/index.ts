import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import {
  FieldValue,
  getFirestore,
  Timestamp,
  type DocumentData,
} from "firebase-admin/firestore";
import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { HttpsError, onCall, onRequest } from "firebase-functions/v2/https";
import {
  deleteCompanyCascade,
  hasPaidSubscriptionData,
} from "./delete-company";
import { incrementMonthlyCompletionCount } from "./billing";
import { appendClientVisit } from "./client-visits";

initializeApp();

const db = getFirestore();
const auth = getAuth();
const DEFAULT_ACCENT = "#FF6600";

interface CompanyData {
  name: string;
  avgServiceTimeMin: number;
  toleranceEnabled?: boolean;
  toleranceMin?: number;
  defaultLocale?: string;
  brand?: { accentColor?: string; logoUrl?: string; tagline?: string };
}

interface WaitingEntry {
  id: string;
  position: number;
  status: string;
  publicToken?: string;
  clientId?: string;
  turnStartedAt?: Timestamp;
  toleranceExpiresAt?: Timestamp;
}

function estimateWaitMin(position: number, avgServiceTimeMin: number): number {
  return Math.max(0, position - 1) * avgServiceTimeMin;
}

function computeQueueRanks(entries: WaitingEntry[]) {
  const sorted = [...entries].sort((a, b) => a.position - b.position);
  const map = new Map<string, { displayPosition: number; isFirst: boolean }>();
  sorted.forEach((entry, index) => {
    map.set(entry.id, { displayPosition: index + 1, isFirst: index === 0 });
  });
  return map;
}

async function getVacancyActive(companyId: string): Promise<boolean> {
  const snap = await db.doc(`companies/${companyId}/meta/vacancy`).get();
  if (!snap.exists) return false;
  const data = snap.data()!;
  return data.active === true && !data.filledEntryId;
}

async function syncPublicQueueSnapshots(
  companyId: string,
  waitingEntries: WaitingEntry[],
  company: CompanyData,
  deferTolerance = false,
) {
  const vacancyBlocking = deferTolerance || (await getVacancyActive(companyId));
  const ranks = computeQueueRanks(waitingEntries);
  const toleranceEnabled = company.toleranceEnabled ?? false;
  const toleranceMin = company.toleranceMin ?? 5;

  await Promise.all(
    waitingEntries.map(async (entry) => {
      if (!entry.publicToken) return;

      const rank = ranks.get(entry.id);
      if (!rank) return;

      const queueRef = db.doc(`companies/${companyId}/queue/${entry.id}`);
      let turnStartedAt = entry.turnStartedAt;
      let toleranceExpiresAt = entry.toleranceExpiresAt;

      if (toleranceEnabled && rank.isFirst && !vacancyBlocking) {
        if (!turnStartedAt) {
          turnStartedAt = Timestamp.now();
          toleranceExpiresAt = Timestamp.fromMillis(
            turnStartedAt.toMillis() + toleranceMin * 60_000,
          );
          await queueRef.update({ turnStartedAt, toleranceExpiresAt });
        }
      } else if (turnStartedAt || toleranceExpiresAt) {
        if (vacancyBlocking || !rank.isFirst) {
          await queueRef.update({
            turnStartedAt: FieldValue.delete(),
            toleranceExpiresAt: FieldValue.delete(),
          });
          turnStartedAt = undefined;
          toleranceExpiresAt = undefined;
        }
      }

      const payload: Record<string, unknown> = {
        companyId,
        entryId: entry.id,
        status: entry.status,
        position: rank.displayPosition,
        estimatedWaitMin: estimateWaitMin(rank.displayPosition, company.avgServiceTimeMin),
        companyName: company.name,
        companyTagline: company.brand?.tagline ?? "",
        avgServiceTimeMin: company.avgServiceTimeMin,
        toleranceEnabled,
        toleranceMin,
        brandAccent: company.brand?.accentColor ?? DEFAULT_ACCENT,
        brandLogoUrl: company.brand?.logoUrl ?? "",
        locale: company.defaultLocale === "en" ? "en" : "pt-BR",
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

async function openQueueVacancy(
  companyId: string,
  removedEntryId: string,
  reason: "tolerance_expired" | "client_cancelled" = "tolerance_expired",
) {
  const vacancyId = crypto.randomUUID();
  await db.doc(`companies/${companyId}/meta/vacancy`).set({
    active: true,
    id: vacancyId,
    createdAt: FieldValue.serverTimestamp(),
    reason,
    removedEntryId,
    declinedEntryIds: [],
    currentOffer: null,
    filledEntryId: null,
    closedAt: null,
  });

  const waitingSnap = await db
    .collection(`companies/${companyId}/queue`)
    .where("status", "==", "waiting")
    .orderBy("position", "asc")
    .get();

  const candidate = waitingSnap.docs.find((d) => d.data().publicToken);
  if (!candidate) return;

  const data = candidate.data();
  const publicToken = data.publicToken as string;
  const offeredAt = new Date();
  const expiresAt = new Date(offeredAt.getTime() + 3 * 60 * 1000);

  await db.doc(`companies/${companyId}/meta/vacancy`).update({
    currentOffer: {
      entryId: candidate.id,
      publicToken,
      clientName: data.clientName ?? "",
      offeredAt: Timestamp.fromDate(offeredAt),
      expiresAt: Timestamp.fromDate(expiresAt),
    },
  });

  await db.doc(`companies/${companyId}/queue/${candidate.id}`).update({
    spotOfferStatus: "pending",
  });

  await db.doc(`publicQueue/${publicToken}`).update({
    spotOffer: {
      vacancyId,
      status: "pending",
      expiresAt: Timestamp.fromDate(expiresAt),
    },
    updatedAt: FieldValue.serverTimestamp(),
  });
}

async function removeQueueEntryDueToTolerance(
  companyId: string,
  entryId: string,
  data: DocumentData,
) {
  const publicToken = data.publicToken as string | undefined;
  const clientId = data.clientId as string | undefined;

  if (publicToken) {
    await db.doc(`publicQueue/${publicToken}`).update({
      status: "expired",
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
      status: "expired",
    });
  }
}

export const onMemberCreated = onDocumentCreated("members/{userId}", async (event) => {
  const data = event.data?.data();
  const userId = event.params.userId;
  if (!data?.companyId) return;

  const role = data.role === "owner" || data.role === "admin" || data.role === "base"
    ? data.role
    : "base";

  await auth.setCustomUserClaims(userId, {
    companyId: data.companyId,
    role,
  });
});

export const onMemberUpdated = onDocumentUpdated("members/{userId}", async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  const userId = event.params.userId;
  if (!after?.companyId) return;

  const roleChanged = before?.role !== after.role;
  const companyChanged = before?.companyId !== after.companyId;
  if (!roleChanged && !companyChanged) return;

  const role = after.role === "owner" || after.role === "admin" || after.role === "base"
    ? after.role
    : "base";

  await auth.setCustomUserClaims(userId, {
    companyId: after.companyId,
    role,
  });
});

export const onQueueEntryUpdated = onDocumentUpdated(
  "companies/{companyId}/queue/{entryId}",
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return;
    if (before.status === after.status) return;
    if (after.status !== "completed") return;
    if (!after.publicToken && !before.publicToken) return;

    const clientId = after.clientId as string | undefined;
    if (clientId) {
      await appendClientVisit(db, {
        companyId: event.params.companyId,
        clientId,
        entryId: event.params.entryId,
        status: "completed",
      });
    }

    await incrementMonthlyCompletionCount(db, event.params.companyId);
  },
);

export const cleanupOtpChallenges = onSchedule("every 6 hours", async () => {
  const cutoff = Timestamp.fromDate(new Date(Date.now() - 24 * 60 * 60 * 1000));
  const snap = await db
    .collection("otpChallenges")
    .where("expiresAt", "<", cutoff)
    .limit(200)
    .get();

  if (snap.empty) return;

  const batch = db.batch();
  snap.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
});

export const cleanupPublicQueue = onSchedule("every 24 hours", async () => {
  const cutoff = Timestamp.fromDate(new Date(Date.now() - 24 * 60 * 60 * 1000));

  const [completedSnap, expiredSnap, cancelledSnap] = await Promise.all([
    db
      .collection("publicQueue")
      .where("status", "==", "completed")
      .where("updatedAt", "<", cutoff)
      .limit(200)
      .get(),
    db
      .collection("publicQueue")
      .where("status", "==", "expired")
      .where("updatedAt", "<", cutoff)
      .limit(200)
      .get(),
    db
      .collection("publicQueue")
      .where("status", "==", "cancelled")
      .where("updatedAt", "<", cutoff)
      .limit(200)
      .get(),
  ]);

  const batch = db.batch();
  completedSnap.docs.forEach((doc) => batch.delete(doc.ref));
  expiredSnap.docs.forEach((doc) => batch.delete(doc.ref));
  cancelledSnap.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
});

export const enforceQueueTolerance = onSchedule("every 1 minutes", async () => {
  const now = Timestamp.now();
  const snap = await db
    .collectionGroup("queue")
    .where("status", "==", "waiting")
    .where("toleranceExpiresAt", "<=", now)
    .limit(50)
    .get();

  if (snap.empty) return;

  const byCompany = new Map<string, string[]>();

  for (const doc of snap.docs) {
    const companyId = doc.ref.parent.parent?.id;
    if (!companyId) continue;
    const list = byCompany.get(companyId) ?? [];
    list.push(doc.id);
    byCompany.set(companyId, list);
  }

  for (const [companyId, entryIds] of byCompany) {
    const companySnap = await db.doc(`companies/${companyId}`).get();
    if (!companySnap.exists) continue;
    const company = companySnap.data() as CompanyData;

    for (const entryId of entryIds) {
      const entryRef = db.doc(`companies/${companyId}/queue/${entryId}`);
      const entrySnap = await entryRef.get();
      if (!entrySnap.exists || entrySnap.data()?.status !== "waiting") continue;

      await removeQueueEntryDueToTolerance(companyId, entryId, entrySnap.data()!);
    }

    const waitingSnap = await db
      .collection(`companies/${companyId}/queue`)
      .where("status", "==", "waiting")
      .orderBy("position", "asc")
      .get();

    const waiting: WaitingEntry[] = waitingSnap.docs.map((d) => ({
      id: d.id,
      position: d.data().position as number,
      status: d.data().status as string,
      publicToken: d.data().publicToken as string | undefined,
      clientId: d.data().clientId as string | undefined,
      turnStartedAt: d.data().turnStartedAt as Timestamp | undefined,
      toleranceExpiresAt: d.data().toleranceExpiresAt as Timestamp | undefined,
    }));

    if (waiting.length > 0) {
      await syncPublicQueueSnapshots(companyId, waiting, company, true);
    }

    await openQueueVacancy(companyId, entryIds[entryIds.length - 1]!);
  }
});

async function completeClientWithdraw(
  token: string,
  before: DocumentData,
  after: DocumentData,
) {
  const companyId = after.companyId as string;
  const entryId = after.entryId as string;
  const position = (before.position as number) ?? 0;
  const spotOffer = before.spotOffer as { status?: string } | undefined;
  const hadPendingOffer = spotOffer?.status === "pending";
  const wasFirst = position === 1;

  const vacancySnap = await db.doc(`companies/${companyId}/meta/vacancy`).get();
  const vacancyData = vacancySnap.data();
  const currentOffer = vacancyData?.currentOffer as
    | { publicToken?: string }
    | undefined;
  if (currentOffer?.publicToken === token) {
    await db.doc(`companies/${companyId}/meta/vacancy`).update({
      currentOffer: FieldValue.delete(),
    });
  }

  const entryRef = db.doc(`companies/${companyId}/queue/${entryId}`);
  const entrySnap = await entryRef.get();
  const clientId = entrySnap.data()?.clientId as string | undefined;

  if (clientId) {
    await appendClientVisit(db, {
      companyId,
      clientId,
      entryId,
      status: "cancelled",
    });
  }

  if (entrySnap.exists) {
    await entryRef.delete();
  }
  if (clientId) {
    await db.doc(`companies/${companyId}/activeWaiting/${clientId}`).delete();
  }

  const companySnap = await db.doc(`companies/${companyId}`).get();
  if (!companySnap.exists) return;
  const company = companySnap.data() as CompanyData;

  const waitingSnap = await db
    .collection(`companies/${companyId}/queue`)
    .where("status", "==", "waiting")
    .orderBy("position", "asc")
    .get();

  const waiting: WaitingEntry[] = waitingSnap.docs.map((d) => ({
    id: d.id,
    position: d.data().position as number,
    status: d.data().status as string,
    publicToken: d.data().publicToken as string | undefined,
    clientId: d.data().clientId as string | undefined,
    turnStartedAt: d.data().turnStartedAt as Timestamp | undefined,
    toleranceExpiresAt: d.data().toleranceExpiresAt as Timestamp | undefined,
  }));

  if (waiting.length > 0) {
    await syncPublicQueueSnapshots(companyId, waiting, company, true);
  }

  if (wasFirst || hadPendingOffer) {
    await openQueueVacancy(companyId, entryId, "client_cancelled");
  }
}

export const onPublicQueueWithdrawn = onDocumentUpdated(
  "publicQueue/{token}",
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return;
    if (before.status !== "waiting" || after.status !== "cancelled") return;

    const token = event.params.token;
    await completeClientWithdraw(token, before, after);
  },
);

export const deleteCompanyAccount = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Autenticação obrigatória.");
  }

  const confirmName =
    typeof request.data?.confirmName === "string"
      ? request.data.confirmName.trim()
      : "";
  const acknowledgeActivePlanNoRefund =
    request.data?.acknowledgeActivePlanNoRefund === true;

  if (!confirmName) {
    throw new HttpsError("invalid-argument", "Nome de confirmação obrigatório.");
  }

  const uid = request.auth.uid;
  const memberSnap = await db.doc(`members/${uid}`).get();

  if (!memberSnap.exists) {
    throw new HttpsError("permission-denied", "Membro não encontrado.");
  }

  const companyId = memberSnap.data()?.companyId as string | undefined;
  if (!companyId) {
    throw new HttpsError("permission-denied", "Empresa não vinculada.");
  }

  const companySnap = await db.doc(`companies/${companyId}`).get();
  if (!companySnap.exists) {
    throw new HttpsError("not-found", "Empresa não encontrada.");
  }

  const companyData = companySnap.data()!;
  const ownerId = companyData.ownerId as string | undefined;

  if (uid !== ownerId) {
    throw new HttpsError(
      "permission-denied",
      "Somente o dono pode excluir o estabelecimento.",
    );
  }

  const subscription = companyData.subscription as
    | { status?: string; planId?: string }
    | undefined;
  if (hasPaidSubscriptionData(subscription) && !acknowledgeActivePlanNoRefund) {
    throw new HttpsError(
      "failed-precondition",
      "Confirme que entende que não haverá reembolso do plano ativo antes de excluir.",
    );
  }

  const companyName = (companyData.name as string | undefined)?.trim() ?? "";
  if (confirmName !== companyName) {
    throw new HttpsError(
      "invalid-argument",
      "O nome informado não confere com o estabelecimento.",
    );
  }

  await deleteCompanyCascade(db, auth, companyId);
  return { ok: true };
});

export const whatsappWebhook = onRequest(async (req, res) => {
  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      res.status(200).send(challenge);
      return;
    }
    res.status(403).send("Forbidden");
    return;
  }

  res.status(200).json({ received: true });
});
