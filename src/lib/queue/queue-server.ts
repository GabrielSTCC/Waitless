import type { Firestore } from "firebase-admin/firestore";
import type { QueueEntry, SpotOfferStatus } from "@/lib/types";

function adminToDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate();
  }
  return undefined;
}

function mapQueueEntryFromAdmin(id: string, data: Record<string, unknown>): QueueEntry {
  return {
    id,
    clientId: data.clientId as string,
    clientName: data.clientName as string,
    clientWhatsapp: data.clientWhatsapp as string,
    status: data.status as QueueEntry["status"],
    position: data.position as number,
    ticketNumber: (data.ticketNumber as number | undefined) ?? 0,
    createdAt: adminToDate(data.createdAt) ?? new Date(),
    startedAt: adminToDate(data.startedAt),
    completedAt: adminToDate(data.completedAt),
    location: data.location as string | undefined,
    estimatedWaitMin: data.estimatedWaitMin as number | undefined,
    publicToken: data.publicToken as string | undefined,
    turnStartedAt: adminToDate(data.turnStartedAt),
    toleranceExpiresAt: adminToDate(data.toleranceExpiresAt),
    spotOfferStatus: data.spotOfferStatus as SpotOfferStatus | undefined,
  };
}

export interface AdminQueueSnapshot {
  waiting: QueueEntry[];
  inService: QueueEntry[];
}

export async function loadQueueServer(
  db: Firestore,
  companyId: string,
): Promise<AdminQueueSnapshot> {
  const queueRef = db.collection(`companies/${companyId}/queue`);

  const [waitingSnap, inServiceSnap] = await Promise.all([
    queueRef.where("status", "==", "waiting").orderBy("position", "asc").get(),
    queueRef.where("status", "==", "in_service").orderBy("startedAt", "asc").get(),
  ]);

  return {
    waiting: waitingSnap.docs.map((doc) =>
      mapQueueEntryFromAdmin(doc.id, doc.data() as Record<string, unknown>),
    ),
    inService: inServiceSnap.docs.map((doc) =>
      mapQueueEntryFromAdmin(doc.id, doc.data() as Record<string, unknown>),
    ),
  };
}
