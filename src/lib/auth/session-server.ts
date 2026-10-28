import type { Firestore } from "firebase-admin/firestore";
import { normalizeRole } from "@/lib/permissions";
import { readAppointmentCompanyFields } from "@/lib/appointments/parse-company";
import type { Company, Member } from "@/lib/types";

function adminToDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate();
  }
  return undefined;
}

function mapMemberFromAdminData(data: Record<string, unknown>): Member {
  const securityData = data.security as Record<string, unknown> | undefined;
  const security =
    securityData && typeof securityData === "object"
      ? {
          twoFactorEnabled: securityData.twoFactorEnabled === true,
          twoFactorMethod:
            securityData.twoFactorMethod === "email" ? ("email" as const) : undefined,
          twoFactorPending: securityData.twoFactorPending === true,
          requireTwoFactorOnNextLogin:
            securityData.requireTwoFactorOnNextLogin === true,
          lastTwoFactorVerifiedAt: adminToDate(securityData.lastTwoFactorVerifiedAt),
        }
      : undefined;

  return {
    companyId: data.companyId as string,
    email: data.email as string,
    role: normalizeRole(data.role as string | undefined),
    ...(security ? { security } : {}),
  };
}

function brOrUs(value: unknown): "BR" | "US" | undefined {
  if (value === "BR" || value === "US") return value;
  return undefined;
}

function mapSubscription(
  subscription: Record<string, unknown> | undefined,
): Company["subscription"] {
  if (!subscription) return undefined;
  const status = subscription.status;
  const interval = subscription.billingInterval;
  const provider = subscription.paymentProvider;
  return {
    status:
      status === "trialing" ||
      status === "active" ||
      status === "past_due" ||
      status === "canceled"
        ? status
        : "none",
    planId: subscription.planId as string | undefined,
    billingInterval:
      interval === "week" || interval === "month" || interval === "year"
        ? interval
        : undefined,
    billingMarket: brOrUs(subscription.billingMarket),
    stripeCustomerId: subscription.stripeCustomerId as string | undefined,
    stripeSubscriptionId: subscription.stripeSubscriptionId as string | undefined,
    asaasCustomerId: subscription.asaasCustomerId as string | undefined,
    asaasSubscriptionId: subscription.asaasSubscriptionId as string | undefined,
    pixPendingPaymentId: subscription.pixPendingPaymentId as string | undefined,
    paymentProvider: provider === "stripe" || provider === "asaas" ? provider : undefined,
    currentPeriodEnd: adminToDate(subscription.currentPeriodEnd),
    trialEndsAt: adminToDate(subscription.trialEndsAt),
  };
}

function mapPlatformControl(
  platformControl: Record<string, unknown> | undefined,
): Company["platformControl"] {
  if (!platformControl) return undefined;
  const status = platformControl.status;
  return {
    status:
      status === "active" || status === "suspended" || status === "paused" ? status : "active",
    reason: typeof platformControl.reason === "string" ? platformControl.reason : undefined,
    updatedAt: adminToDate(platformControl.updatedAt),
    updatedBy:
      typeof platformControl.updatedBy === "string" ? platformControl.updatedBy : undefined,
  };
}

function mapLegal(legal: Record<string, unknown> | undefined): Company["legal"] {
  if (!legal) return undefined;
  const cnpj = legal.cnpj;
  const legalName = legal.legalName;
  if (typeof cnpj !== "string" && typeof legalName !== "string") return undefined;
  return {
    cnpj: typeof cnpj === "string" ? cnpj.replace(/\D/g, "") || undefined : undefined,
    legalName: typeof legalName === "string" ? legalName.trim() || undefined : undefined,
  };
}

function mapContactWhatsapp(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  return value.replace(/\D/g, "") || undefined;
}

export function mapCompanyFromAdminData(
  id: string,
  data: Record<string, unknown>,
): Company {
  const brand = data.brand as Record<string, unknown> | undefined;

  return {
    id,
    name: data.name as string,
    ownerId: data.ownerId as string,
    avgServiceTimeMin: (data.avgServiceTimeMin as number | undefined) ?? 10,
    toleranceEnabled: data.toleranceEnabled === true,
    toleranceMin: (data.toleranceMin as number | undefined) ?? 5,
    defaultLocale: data.defaultLocale === "en" ? "en" : "pt-BR",
    billingCountry: brOrUs(data.billingCountry),
    billingMarket: brOrUs(data.billingMarket),
    subscription: mapSubscription(data.subscription as Record<string, unknown> | undefined),
    platformControl: mapPlatformControl(
      data.platformControl as Record<string, unknown> | undefined,
    ),
    legal: mapLegal(data.legal as Record<string, unknown> | undefined),
    contactWhatsapp: mapContactWhatsapp(data.contactWhatsapp),
    ...readAppointmentCompanyFields(data),
    brand: brand
      ? {
          accentColor: brand.accentColor as string | undefined,
          logoUrl: brand.logoUrl as string | undefined,
          tagline: brand.tagline as string | undefined,
        }
      : undefined,
    createdAt: adminToDate(data.createdAt) ?? new Date(),
  };
}

export interface SessionPayload {
  member: Member | null;
  company: Company | null;
}

export async function loadSessionServer(
  db: Firestore,
  uid: string,
): Promise<SessionPayload> {
  const memberSnap = await db.doc(`members/${uid}`).get();
  if (!memberSnap.exists) {
    return { member: null, company: null };
  }

  const member = mapMemberFromAdminData(memberSnap.data()!);
  const companySnap = await db.doc(`companies/${member.companyId}`).get();
  if (!companySnap.exists) {
    return { member, company: null };
  }

  return {
    member,
    company: mapCompanyFromAdminData(companySnap.id, companySnap.data()!),
  };
}
