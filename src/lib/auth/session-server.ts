import type { Firestore } from "firebase-admin/firestore";
import { normalizeRole } from "@/lib/permissions";
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

export function mapCompanyFromAdminData(
  id: string,
  data: Record<string, unknown>,
): Company {
  const subscription = data.subscription as Record<string, unknown> | undefined;
  const platformControl = data.platformControl as Record<string, unknown> | undefined;
  const legal = data.legal as Record<string, unknown> | undefined;
  const brand = data.brand as Record<string, unknown> | undefined;

  return {
    id,
    name: data.name as string,
    ownerId: data.ownerId as string,
    avgServiceTimeMin: (data.avgServiceTimeMin as number | undefined) ?? 10,
    toleranceEnabled: data.toleranceEnabled === true,
    toleranceMin: (data.toleranceMin as number | undefined) ?? 5,
    defaultLocale: data.defaultLocale === "en" ? "en" : "pt-BR",
    billingCountry:
      data.billingCountry === "BR" || data.billingCountry === "US"
        ? data.billingCountry
        : undefined,
    billingMarket:
      data.billingMarket === "BR" || data.billingMarket === "US"
        ? data.billingMarket
        : undefined,
    subscription: subscription
      ? {
          status:
            subscription.status === "trialing" ||
            subscription.status === "active" ||
            subscription.status === "past_due" ||
            subscription.status === "canceled"
              ? subscription.status
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
          stripeCustomerId: subscription.stripeCustomerId as string | undefined,
          stripeSubscriptionId: subscription.stripeSubscriptionId as string | undefined,
          asaasCustomerId: subscription.asaasCustomerId as string | undefined,
          asaasSubscriptionId: subscription.asaasSubscriptionId as string | undefined,
          paymentProvider:
            subscription.paymentProvider === "stripe" ||
            subscription.paymentProvider === "asaas"
              ? subscription.paymentProvider
              : undefined,
          currentPeriodEnd: adminToDate(subscription.currentPeriodEnd),
          trialEndsAt: adminToDate(subscription.trialEndsAt),
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
          updatedAt: adminToDate(platformControl.updatedAt),
          updatedBy:
            typeof platformControl.updatedBy === "string"
              ? platformControl.updatedBy
              : undefined,
        }
      : undefined,
    legal:
      legal &&
      (typeof legal.cnpj === "string" || typeof legal.legalName === "string")
        ? {
            cnpj:
              typeof legal.cnpj === "string"
                ? legal.cnpj.replace(/\D/g, "") || undefined
                : undefined,
            legalName:
              typeof legal.legalName === "string"
                ? legal.legalName.trim() || undefined
                : undefined,
          }
        : undefined,
    contactWhatsapp:
      typeof data.contactWhatsapp === "string"
        ? data.contactWhatsapp.replace(/\D/g, "") || undefined
        : undefined,
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
