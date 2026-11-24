/**
 * Leitura em tempo real da vaga + withdraw público via API.
 * Mutações admin: @/lib/queue/vacancy-actions (sem writes no SDK).
 */
import {
  doc,
  getDoc,
  type Unsubscribe,
  onSnapshot,
} from "firebase/firestore";
import { ensureDb, getDb } from "@/lib/firebase/config";
import { mapQueueVacancy } from "@/lib/firebase/mappers";
import type { QueueVacancy } from "@/lib/types";

function vacancyRef(companyId: string) {
  return doc(getDb(), "companies", companyId, "meta", "vacancy");
}

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

export async function isVacancyBlockingTolerance(
  companyId: string,
): Promise<boolean> {
  const vacancy = await getQueueVacancy(companyId);
  return vacancy?.active === true;
}

/** Cliente público: desmarca só via API (sem fallback SDK). */
export async function withdrawFromQueue(
  token: string,
): Promise<{ ok: boolean; error?: string; alreadyCancelled?: boolean }> {
  try {
    const res = await fetch("/api/queue/withdraw", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
      alreadyCancelled?: boolean;
    };
    if (!res.ok) {
      return {
        ok: false,
        error: data.error ?? "Não foi possível desmarcar. Tente novamente.",
      };
    }
    return { ok: true, alreadyCancelled: data.alreadyCancelled === true };
  } catch {
    return {
      ok: false,
      error: "Não foi possível desmarcar. Tente novamente.",
    };
  }
}
