import { auth } from "@/lib/firebase/config";
import type { Company, Member, SubscriptionStatus } from "@/lib/types";

export interface SessionPayload {
  member: Member | null;
  company: Company | null;
}

function parseDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }
  return undefined;
}

const SUBSCRIPTION_STATUSES = new Set<SubscriptionStatus>([
  "none",
  "trialing",
  "active",
  "past_due",
  "canceled",
]);

function reviveSubscription(
  subscription: Record<string, unknown> | undefined,
): Company["subscription"] {
  if (!subscription) return undefined;
  const subscriptionStatus = subscription.status as SubscriptionStatus | undefined;
  const interval = subscription.billingInterval;
  const provider = subscription.paymentProvider;
  return {
    status:
      subscriptionStatus && SUBSCRIPTION_STATUSES.has(subscriptionStatus)
        ? subscriptionStatus
        : "none",
    planId: subscription.planId as string | undefined,
    billingInterval:
      interval === "week" || interval === "month" || interval === "year" ? interval : undefined,
    billingMarket:
      subscription.billingMarket === "BR" || subscription.billingMarket === "US"
        ? subscription.billingMarket
        : undefined,
    paymentProvider: provider === "stripe" || provider === "asaas" ? provider : undefined,
    stripeCustomerId: subscription.stripeCustomerId as string | undefined,
    stripeSubscriptionId: subscription.stripeSubscriptionId as string | undefined,
    asaasCustomerId: subscription.asaasCustomerId as string | undefined,
    asaasSubscriptionId: subscription.asaasSubscriptionId as string | undefined,
    currentPeriodEnd: parseDate(subscription.currentPeriodEnd),
    trialEndsAt: parseDate(subscription.trialEndsAt),
  };
}

function revivePlatformControl(
  platformControl: Record<string, unknown> | undefined,
): Company["platformControl"] {
  if (!platformControl) return undefined;
  const status = platformControl.status;
  return {
    status:
      status === "active" || status === "suspended" || status === "paused" ? status : "active",
    reason: typeof platformControl.reason === "string" ? platformControl.reason : undefined,
    updatedAt: parseDate(platformControl.updatedAt),
    updatedBy:
      typeof platformControl.updatedBy === "string" ? platformControl.updatedBy : undefined,
  };
}

export function reviveCompany(raw: Record<string, unknown>): Company {
  return {
    ...(raw as unknown as Company),
    createdAt: parseDate(raw.createdAt) ?? new Date(),
    subscription: reviveSubscription(raw.subscription as Record<string, unknown> | undefined),
    platformControl: revivePlatformControl(
      raw.platformControl as Record<string, unknown> | undefined,
    ),
  };
}

function reviveMember(raw: Record<string, unknown>): Member {
  const security = raw.security as Record<string, unknown> | undefined;
  return {
    companyId: raw.companyId as string,
    email: raw.email as string,
    role: raw.role as Member["role"],
    ...(security
      ? {
          security: {
            ...(security as Member["security"]),
            lastTwoFactorVerifiedAt: parseDate(security.lastTwoFactorVerifiedAt),
          },
        }
      : {}),
  };
}

export async function fetchSessionViaApi(): Promise<SessionPayload> {
  const user = auth.currentUser;
  if (!user) {
    return { member: null, company: null };
  }

  const idToken = await user.getIdToken();
  const response = await fetch("/api/auth/session", {
    headers: { Authorization: `Bearer ${idToken}` },
  });

  const data = (await response.json().catch(() => ({}))) as {
    member?: Record<string, unknown> | null;
    company?: Record<string, unknown> | null;
    error?: string;
  };

  if (!response.ok) {
    throw new Error(data.error ?? "Falha ao carregar sessão.");
  }

  return {
    member: data.member ? reviveMember(data.member) : null,
    company: data.company ? reviveCompany(data.company) : null,
  };
}
