import { doc, getDoc } from "firebase/firestore";
import { ensureDb } from "@/lib/firebase/config";

export function getCurrentMonthKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export async function getMonthlyCompletionCount(companyId: string): Promise<number> {
  const snap = await getDoc(doc(await ensureDb(), "companies", companyId, "meta", "billing"));
  const data = snap.data();
  const currentKey = getCurrentMonthKey();
  if (data?.monthKey !== currentKey) return 0;
  return (data?.completedCount as number | undefined) ?? 0;
}
