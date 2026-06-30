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

export function reviveCompany(raw: Record<string, unknown>): Company {
  const subscription = raw.subscription as Record<string, unknown> | undefined;
  const platformControl = raw.platformControl as Record<string, unknown> | undefined;
  const validStatuses: SubscriptionStatus[] = [
    "none",
    "trialing",
    "active",
    "past_due",
    "canceled",
  ];
  const subscriptionStatus = subscription?.status as SubscriptionStatus | undefined;

  return {
    ...(raw as unknown as Company),
    createdAt: parseDate(raw.createdAt) ?? new Date(),
    subscription: subscription
      ? {
          status:
            subscriptionStatus && validStatuses.includes(subscriptionStatus)
              ? subscriptionStatus
              : "none",
          planId: subscription.planId as string | undefined,
          billingInterval:
            subscription.billingInterval === "week" ||
            subscription.billingInterval === "month" ||
            subscription.billingInterval === "year"
              ? subscription.billingInterval
              : undefined,
          billingMarket:
            subscription.billingMarket === "BR" || subscription.billingMarket === "US"
              ? subscription.billingMarket
              : undefined,
          paymentProvider:
            subscription.paymentProvider === "stripe" ||
            subscription.paymentProvider === "asaas"
              ? subscription.paymentProvider
              : undefined,
          stripeCustomerId: subscription.stripeCustomerId as string | undefined,
          stripeSubscriptionId: subscription.stripeSubscriptionId as string | undefined,
          asaasCustomerId: subscription.asaasCustomerId as string | undefined,
          asaasSubscriptionId: subscription.asaasSubscriptionId as string | undefined,
          currentPeriodEnd: parseDate(subscription.currentPeriodEnd),
          trialEndsAt: parseDate(subscription.trialEndsAt),
        }
      : undefined,
    platformControl: platformControl
      ? {
          status:
            platformControl.status === "active" ||
            platformControl.status === "suspended" ||
            platformControl.status === "paused"
              ? platformControl.status
              : "active",
          reason:
            typeof platformControl.reason === "string"
              ? platformControl.reason
              : undefined,
          updatedAt: parseDate(platformControl.updatedAt),
          updatedBy:
            typeof platformControl.updatedBy === "string"
              ? platformControl.updatedBy
              : undefined,
        }
      : undefined,
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
