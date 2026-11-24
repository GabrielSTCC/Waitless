import { auth } from "@/lib/firebase/config";
import { getDeviceHeaders } from "@/lib/auth/device-id";

type VacancyAction =
  | "offer"
  | "assign"
  | "close"
  | "markNoShow"
  | "toleranceExpired";

async function authHeaders(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) throw new Error("Não autenticado.");
  const idToken = await user.getIdToken();
  return {
    Authorization: `Bearer ${idToken}`,
    "Content-Type": "application/json",
    ...getDeviceHeaders(),
  };
}

async function postVacancy(
  companyId: string,
  action: VacancyAction,
  entryId?: string,
): Promise<void> {
  const response = await fetch("/api/admin/vacancy", {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ companyId, action, entryId }),
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? "Erro na operação de vaga.");
  }
}

export async function offerSpotToNextWaiting(companyId: string): Promise<void> {
  await postVacancy(companyId, "offer");
}

export async function assignVacancyManually(
  companyId: string,
  entryId: string,
): Promise<void> {
  await postVacancy(companyId, "assign", entryId);
}

export async function closeVacancy(companyId: string): Promise<void> {
  await postVacancy(companyId, "close");
}

export async function markNoShow(
  companyId: string,
  entryId: string,
): Promise<void> {
  await postVacancy(companyId, "markNoShow", entryId);
}

export async function removeToleranceExpired(
  companyId: string,
  entryId: string,
): Promise<void> {
  await postVacancy(companyId, "toleranceExpired", entryId);
}
