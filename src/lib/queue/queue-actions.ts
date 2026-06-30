import { auth } from "@/lib/firebase/config";
import type { Client, QueueStatus } from "@/lib/types";
import {
  addExistingClientToQueue as addExistingClientToQueueFirestore,
  ClientAlreadyInQueueError,
  PlanLimitError,
  updateQueueStatus as updateQueueStatusFirestore,
  upsertClientAndAddToQueue as upsertClientAndAddToQueueFirestore,
} from "@/lib/firebase/firestore";
import { isFirestoreClientReadySignal } from "@/lib/firebase/firestore-ready-signal";

export { ClientAlreadyInQueueError, PlanLimitError };

async function authHeaders(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) throw new Error("Não autenticado.");
  const idToken = await user.getIdToken();
  return {
    Authorization: `Bearer ${idToken}`,
    "Content-Type": "application/json",
  };
}

async function parseError(response: Response): Promise<never> {
  const data = (await response.json().catch(() => ({}))) as { error?: string };
  const message = data.error ?? "Erro na operação da fila.";
  if (response.status === 409) {
    throw new ClientAlreadyInQueueError(message);
  }
  if (response.status === 403 && message.includes("Limite mensal")) {
    throw new PlanLimitError("monthly_limit", message);
  }
  throw new Error(message);
}

export async function addToQueueViaApi(
  companyId: string,
  input: { name: string; whatsapp: string },
  avgServiceTimeMin: number,
): Promise<string> {
  const response = await fetch("/api/admin/queue", {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ companyId, ...input, avgServiceTimeMin }),
  });

  if (!response.ok) await parseError(response);

  const data = (await response.json()) as { entryId?: string };
  if (!data.entryId) throw new Error("Resposta inválida ao adicionar à fila.");
  return data.entryId;
}

export async function updateQueueStatusViaApi(
  companyId: string,
  entryId: string,
  status: QueueStatus,
): Promise<void> {
  const response = await fetch("/api/admin/queue", {
    method: "PATCH",
    headers: await authHeaders(),
    body: JSON.stringify({ companyId, entryId, status }),
  });

  if (!response.ok) await parseError(response);
}

export async function fetchMonthlyUsageViaApi(companyId: string): Promise<number | null> {
  const user = auth.currentUser;
  if (!user) return null;

  const idToken = await user.getIdToken();
  const response = await fetch(
    `/api/admin/usage?companyId=${encodeURIComponent(companyId)}`,
    { headers: { Authorization: `Bearer ${idToken}` } },
  );

  if (!response.ok) return null;
  const data = (await response.json()) as { count?: number };
  return data.count ?? null;
}

export async function upsertClientAndAddToQueue(
  companyId: string,
  input: { name: string; whatsapp: string },
  avgServiceTimeMin: number,
): Promise<string> {
  if (isFirestoreClientReadySignal()) {
    return upsertClientAndAddToQueueFirestore(companyId, input, avgServiceTimeMin);
  }
  return addToQueueViaApi(companyId, input, avgServiceTimeMin);
}

export async function addExistingClientToQueue(
  companyId: string,
  client: Client,
  avgServiceTimeMin: number,
): Promise<void> {
  await upsertClientAndAddToQueue(
    companyId,
    { name: client.name, whatsapp: client.whatsapp },
    avgServiceTimeMin,
  );
}

export async function updateQueueStatus(
  companyId: string,
  entryId: string,
  status: QueueStatus,
): Promise<void> {
  if (isFirestoreClientReadySignal()) {
    return updateQueueStatusFirestore(companyId, entryId, status);
  }
  return updateQueueStatusViaApi(companyId, entryId, status);
}
