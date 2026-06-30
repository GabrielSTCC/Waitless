import { Timestamp, type Firestore } from "firebase-admin/firestore";
import type { QueueEntry } from "@/lib/types";

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
    spotOfferStatus: data.spotOfferStatus as QueueEntry["spotOfferStatus"],
  };
}

export interface AdminAnalyticsPayload {
  completed: QueueEntry[];
  meta: {
    totalServed: number;
    totalServedToday: number;
    avgWaitMinToday: number;
  };
  clientCount: number;
}

export async function loadAnalyticsServer(
  db: Firestore,
  companyId: string,
  since: Date,
  max = 500,
): Promise<AdminAnalyticsPayload> {
  const [completedSnap, analyticsSnap, clientsSnap] = await Promise.all([
    db
      .collection(`companies/${companyId}/queue`)
      .where("status", "==", "completed")
      .where("completedAt", ">=", Timestamp.fromDate(since))
      .orderBy("completedAt", "desc")
      .limit(max)
      .get(),
    db.doc(`companies/${companyId}/meta/analytics`).get(),
    db.collection(`companies/${companyId}/clients`).limit(1000).get(),
  ]);

  const analyticsData = analyticsSnap.data();

  return {
    completed: completedSnap.docs.map((doc) =>
      mapQueueEntryFromAdmin(doc.id, doc.data() as Record<string, unknown>),
    ),
    meta: {
      totalServed: (analyticsData?.totalServed as number | undefined) ?? 0,
      totalServedToday: (analyticsData?.totalServedToday as number | undefined) ?? 0,
      avgWaitMinToday: (analyticsData?.avgWaitMinToday as number | undefined) ?? 0,
    },
    clientCount: clientsSnap.size,
  };
}
