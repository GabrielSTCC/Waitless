import type { Firestore } from "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";
import { mapCompanyFromAdminData } from "@/lib/auth/session-server";
import { buildPublicQueueCompanyFields } from "@/lib/queue/public-queue-company-fields";
import type { Company } from "@/lib/types";

const BATCH_LIMIT = 500;
const ACTIVE_STATUSES = new Set(["waiting", "in_service"]);

export async function syncPublicQueueBrandingServer(
  db: Firestore,
  companyId: string,
  company?: Company,
): Promise<number> {
  const resolvedCompany =
    company ??
    (await (async () => {
      const snap = await db.doc(`companies/${companyId}`).get();
      if (!snap.exists) return null;
      return mapCompanyFromAdminData(companyId, snap.data()!);
    })());

  if (!resolvedCompany) return 0;

  const snap = await db
    .collection("publicQueue")
    .where("companyId", "==", companyId)
    .get();

  if (snap.empty) return 0;

  let updated = 0;
  let batch = db.batch();
  let batchSize = 0;

  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    const status = data.status as string | undefined;
    if (!status || !ACTIVE_STATUSES.has(status)) continue;

    const position =
      typeof data.position === "number" ? data.position : undefined;
    const fields = buildPublicQueueCompanyFields(resolvedCompany, position);

    batch.update(docSnap.ref, {
      ...fields,
      updatedAt: FieldValue.serverTimestamp(),
    });
    batchSize += 1;
    updated += 1;

    if (batchSize >= BATCH_LIMIT) {
      await batch.commit();
      batch = db.batch();
      batchSize = 0;
    }
  }

  if (batchSize > 0) {
    await batch.commit();
  }

  return updated;
}
