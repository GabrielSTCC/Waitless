import { getDeviceHeaders } from "@/lib/auth/device-id";
import type {
  BillingTransaction,
  BillingTransactionSummary,
  PlatformAuditEntry,
  PlatformCompanySummary,
  PlatformStats,
  SubscriptionStatus,
} from "@/lib/types";
import type { PlanTier } from "@/lib/billing/plans";
import type { CompanyDetail } from "@/lib/platform/companies";

async function platformFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...getDeviceHeaders(),
      ...(init?.headers ?? {}),
    },
  });

  const body = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    throw new Error(body.error ?? `Erro ${res.status}`);
  }
  return body;
}

export async function verifyPlatformSession(): Promise<boolean> {
  try {
    const res = await fetch("/api/platform/auth/session", {
      credentials: "include",
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function notifyPlatformAuthFailure(
  event: "login_failed_password" | "login_failed_unauthorized",
  attemptedEmail?: string,
): Promise<void> {
  await fetch("/api/platform/auth/notify", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", ...getDeviceHeaders() },
    body: JSON.stringify({ event, attemptedEmail }),
  }).catch(() => undefined);
}

export interface PlatformAuthStartResponse {
  requiresOtp: boolean;
  challengeId?: string;
  email?: string;
  ok?: boolean;
}

export async function startPlatformAuth(idToken: string): Promise<PlatformAuthStartResponse> {
  const res = await fetch("/api/platform/auth/start", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
      ...getDeviceHeaders(),
    },
  });

  const body = (await res.json().catch(() => ({}))) as PlatformAuthStartResponse & {
    error?: string;
  };

  if (!res.ok) {
    throw new Error(body.error ?? `Erro ${res.status}`);
  }

  return body;
}

export async function verifyPlatformAuthOtp(input: {
  idToken: string;
  challengeId: string;
  code: string;
  trustDevice: boolean;
}): Promise<void> {
  const res = await fetch("/api/platform/auth/verify", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${input.idToken}`,
      ...getDeviceHeaders(),
    },
    body: JSON.stringify({
      challengeId: input.challengeId,
      code: input.code,
      trustDevice: input.trustDevice,
    }),
  });

  const body = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) {
    throw new Error(body.error ?? `Erro ${res.status}`);
  }
}

export async function logoutPlatformSession(): Promise<void> {
  await fetch("/api/platform/auth/session", {
    method: "DELETE",
    credentials: "include",
  }).catch(() => undefined);
}

export async function fetchPlatformStats(): Promise<PlatformStats> {
  return platformFetch<PlatformStats>("/api/platform/stats");
}

export interface CompaniesListResponse {
  companies: PlatformCompanySummary[];
  total: number;
  page: number;
  pageSize: number;
}

export async function fetchPlatformCompanies(
  params: Record<string, string | number | undefined> = {},
): Promise<CompaniesListResponse> {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      search.set(key, String(value));
    }
  }
  const qs = search.toString();
  return platformFetch<CompaniesListResponse>(
    `/api/platform/companies${qs ? `?${qs}` : ""}`,
  );
}

export async function fetchPlatformCompany(id: string): Promise<CompanyDetail> {
  return platformFetch<CompanyDetail>(`/api/platform/companies/${id}`);
}

export async function updatePlatformCompanyControl(
  id: string,
  input: { status: "active" | "suspended" | "paused"; reason?: string },
): Promise<{ ok: boolean }> {
  return platformFetch<{ ok: boolean }>(`/api/platform/companies/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deletePlatformCompany(
  id: string,
  confirmName: string,
): Promise<{ ok: boolean }> {
  return platformFetch<{ ok: boolean }>(`/api/platform/companies/${id}/delete`, {
    method: "POST",
    body: JSON.stringify({ confirmName }),
  });
}

export async function syncPlatformCompanyStripe(id: string): Promise<{ ok: boolean }> {
  return platformFetch<{ ok: boolean }>(`/api/platform/companies/${id}/sync-stripe`, {
    method: "POST",
  });
}

export async function updatePlatformCompanySubscription(
  id: string,
  input: { planId: PlanTier; status?: SubscriptionStatus; reason?: string },
): Promise<CompanyDetail> {
  return platformFetch<CompanyDetail>(`/api/platform/companies/${id}/subscription`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export interface AuditListResponse {
  entries: PlatformAuditEntry[];
  total: number;
  page: number;
  pageSize: number;
}

export async function fetchPlatformAudit(
  params: Record<string, string | number | undefined> = {},
): Promise<AuditListResponse> {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      search.set(key, String(value));
    }
  }
  const qs = search.toString();
  return platformFetch<AuditListResponse>(
    `/api/platform/audit${qs ? `?${qs}` : ""}`,
  );
}

function reviveBillingTransaction(raw: BillingTransaction & { occurredAt: string; updatedAt: string }): BillingTransaction {
  return {
    ...raw,
    occurredAt: new Date(raw.occurredAt),
    updatedAt: new Date(raw.updatedAt),
  };
}

export interface TransactionsListResponse {
  transactions: BillingTransaction[];
  total: number;
  page: number;
  pageSize: number;
  summary: BillingTransactionSummary;
  indexPending?: boolean;
}

export async function fetchPlatformTransactions(
  params: Record<string, string | number | undefined> = {},
): Promise<TransactionsListResponse> {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      search.set(key, String(value));
    }
  }
  const qs = search.toString();
  const body = await platformFetch<
    TransactionsListResponse & {
      transactions: Array<BillingTransaction & { occurredAt: string; updatedAt: string }>;
    }
  >(`/api/platform/transactions${qs ? `?${qs}` : ""}`);

  return {
    ...body,
    transactions: body.transactions.map(reviveBillingTransaction),
  };
}
