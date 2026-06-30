import { auth } from "@/lib/firebase/config";
import type { Client } from "@/lib/types";

function parseDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }
  return undefined;
}

function reviveClient(raw: Record<string, unknown>): Client {
  return {
    ...(raw as unknown as Client),
    createdAt: parseDate(raw.createdAt) ?? new Date(),
    lastVisitAt: parseDate(raw.lastVisitAt) ?? new Date(),
  };
}

export async function fetchClientsViaApi(companyId: string): Promise<Client[] | null> {
  const user = auth.currentUser;
  if (!user) return null;

  const idToken = await user.getIdToken();
  const response = await fetch(
    `/api/admin/clients?companyId=${encodeURIComponent(companyId)}`,
    { headers: { Authorization: `Bearer ${idToken}` } },
  );

  if (!response.ok) return null;

  const data = (await response.json().catch(() => ({}))) as {
    clients?: Record<string, unknown>[];
  };

  return (data.clients ?? []).map(reviveClient);
}
