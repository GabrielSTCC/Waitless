import type { Firestore } from "firebase-admin/firestore";
import type { PlatformStats } from "@/lib/types";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export async function computePlatformStats(db: Firestore): Promise<PlatformStats> {
  const companiesSnap = await db.collection("companies").get();
  const cutoff = Date.now() - THIRTY_DAYS_MS;

  let activeSubscriptions = 0;
  let pastDueCount = 0;
  let suspendedCount = 0;
  let pausedCount = 0;
  let newCompaniesLast30Days = 0;
  let totalClients = 0;
  let queueWaitingNow = 0;

  await Promise.all(
    companiesSnap.docs.map(async (doc) => {
      const data = doc.data();
      const companyId = doc.id;
      const status = (data.subscription?.status as string | undefined) ?? "none";
      const platformStatus =
        (data.platformControl?.status as string | undefined) ?? "active";

      if (status === "active" || status === "trialing") activeSubscriptions += 1;
      if (status === "past_due") pastDueCount += 1;
      if (platformStatus === "suspended") suspendedCount += 1;
      if (platformStatus === "paused") pausedCount += 1;

      const createdAt = data.createdAt;
      const createdMs =
        createdAt && typeof createdAt.toDate === "function"
          ? createdAt.toDate().getTime()
          : 0;
      if (createdMs >= cutoff) newCompaniesLast30Days += 1;

      const [clientCountSnap, queueCountSnap] = await Promise.all([
        db.collection(`companies/${companyId}/clients`).count().get(),
        db
          .collection(`companies/${companyId}/queue`)
          .where("status", "==", "waiting")
          .count()
          .get(),
      ]);

      totalClients += clientCountSnap.data().count;
      queueWaitingNow += queueCountSnap.data().count;
    }),
  );

  return {
    totalCompanies: companiesSnap.size,
    activeSubscriptions,
    pastDueCount,
    suspendedCount,
    pausedCount,
    totalClients,
    newCompaniesLast30Days,
    queueWaitingNow,
  };
}
