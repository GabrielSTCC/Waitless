import { auth } from "@/lib/firebase/config";
import type { QueueEntry } from "@/lib/types";

function parseDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }
  return undefined;
}

function reviveQueueEntry(raw: Record<string, unknown>): QueueEntry {
  return {
    ...(raw as unknown as QueueEntry),
    createdAt: parseDate(raw.createdAt) ?? new Date(),
    startedAt: parseDate(raw.startedAt),
    completedAt: parseDate(raw.completedAt),
    turnStartedAt: parseDate(raw.turnStartedAt),
    toleranceExpiresAt: parseDate(raw.toleranceExpiresAt),
  };
}

export async function fetchQueueViaApi(
  companyId: string,
): Promise<{ waiting: QueueEntry[]; inService: QueueEntry[] } | null> {
  const user = auth.currentUser;
  if (!user) return null;

  const idToken = await user.getIdToken();
  const response = await fetch(
    `/api/admin/queue?companyId=${encodeURIComponent(companyId)}`,
    { headers: { Authorization: `Bearer ${idToken}` } },
  );

  if (!response.ok) return null;

  const data = (await response.json().catch(() => ({}))) as {
    waiting?: Record<string, unknown>[];
    inService?: Record<string, unknown>[];
  };

  return {
    waiting: (data.waiting ?? []).map(reviveQueueEntry),
    inService: (data.inService ?? []).map(reviveQueueEntry),
  };
}
