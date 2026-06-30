import type { Firestore } from "firebase-admin/firestore";
import type { Client } from "@/lib/types";

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

function mapClientFromAdmin(id: string, data: Record<string, unknown>): Client {
  return {
    id,
    name: data.name as string,
    whatsapp: data.whatsapp as string,
    normalizedWhatsapp: data.normalizedWhatsapp as string,
    normalizedName: data.normalizedName as string,
    visitCount: (data.visitCount as number | undefined) ?? 0,
    createdAt: adminToDate(data.createdAt) ?? new Date(),
    lastVisitAt: adminToDate(data.lastVisitAt) ?? adminToDate(data.createdAt) ?? new Date(),
  };
}

export async function listClientsServer(
  db: Firestore,
  companyId: string,
  max = 50,
): Promise<Client[]> {
  const clientsRef = db.collection(`companies/${companyId}/clients`);

  try {
    const snap = await clientsRef.orderBy("lastVisitAt", "desc").limit(max).get();
    return snap.docs.map((doc) =>
      mapClientFromAdmin(doc.id, doc.data() as Record<string, unknown>),
    );
  } catch {
    const snap = await clientsRef.limit(max).get();
    return snap.docs
      .map((doc) => mapClientFromAdmin(doc.id, doc.data() as Record<string, unknown>))
      .sort((a, b) => b.lastVisitAt.getTime() - a.lastVisitAt.getTime())
      .slice(0, max);
  }
}
