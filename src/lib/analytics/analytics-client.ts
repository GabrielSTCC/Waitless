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

export interface AnalyticsApiPayload {
  completed: QueueEntry[];
  meta: {
    totalServed: number;
    totalServedToday: number;
    avgWaitMinToday: number;
  };
  clientCount: number;
}

export async function fetchAnalyticsViaApi(
  companyId: string,
  sinceIso: string,
): Promise<AnalyticsApiPayload | null> {
  const user = auth.currentUser;
  if (!user) return null;

  const idToken = await user.getIdToken();
  const params = new URLSearchParams({
    companyId,
    since: sinceIso,
  });
  const response = await fetch(`/api/admin/analytics?${params.toString()}`, {
    headers: { Authorization: `Bearer ${idToken}` },
  });

  if (!response.ok) return null;

  const data = (await response.json().catch(() => ({}))) as {
    completed?: Record<string, unknown>[];
    meta?: AnalyticsApiPayload["meta"];
    clientCount?: number;
  };

  return {
    completed: (data.completed ?? []).map(reviveQueueEntry),
    meta: data.meta ?? { totalServed: 0, totalServedToday: 0, avgWaitMinToday: 0 },
    clientCount: data.clientCount ?? 0,
  };
}
