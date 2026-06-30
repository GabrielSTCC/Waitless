import {
  Timestamp,
  type DocumentData,
  type DocumentSnapshot,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { normalizeRole } from "@/lib/permissions";
import type {
  Client,
  Company,
  CompanyLegal,
  CompanySubscription,
  Member,
  PlatformControl,
  PlatformControlStatus,
  PublicQueueSnapshot,
  QueueEntry,
  QueueVacancy,
  SpotOffer,
  SpotOfferStatus,
  SubscriptionStatus,
  VacancyReason,
} from "@/lib/types";

function mapLegal(data: Record<string, unknown> | undefined): CompanyLegal | undefined {
  if (!data) return undefined;
  const cnpj = typeof data.cnpj === "string" ? data.cnpj.replace(/\D/g, "") : undefined;
  const legalName =
    typeof data.legalName === "string" ? data.legalName.trim() : undefined;
  if (!cnpj && !legalName) return undefined;
  return {
    cnpj: cnpj || undefined,
    legalName: legalName || undefined,
  };
}

function mapPlatformControl(
  data: Record<string, unknown> | undefined,
): PlatformControl | undefined {
  if (!data) return undefined;
  const status = data.status as PlatformControlStatus | undefined;
  const valid: PlatformControlStatus[] = ["active", "suspended", "paused"];
  if (!status || !valid.includes(status)) return undefined;
  return {
    status,
    reason: typeof data.reason === "string" ? data.reason : undefined,
    updatedAt: toDate(data.updatedAt as Timestamp | undefined),
    updatedBy: typeof data.updatedBy === "string" ? data.updatedBy : undefined,
  };
}

function mapSubscription(data: Record<string, unknown> | undefined): CompanySubscription {
  const status = (data?.status as SubscriptionStatus | undefined) ?? "none";
  const valid: SubscriptionStatus[] = [
    "none",
    "trialing",
    "active",
    "past_due",
    "canceled",
  ];
  const billingInterval = data?.billingInterval;
  const billingMarket = data?.billingMarket;
  const paymentProvider = data?.paymentProvider;

  return {
    status: valid.includes(status) ? status : "none",
    planId: data?.planId as string | undefined,
    billingInterval:
      billingInterval === "week" ||
      billingInterval === "month" ||
      billingInterval === "year"
        ? billingInterval
        : undefined,
    billingMarket: billingMarket === "BR" || billingMarket === "US" ? billingMarket : undefined,
    paymentProvider:
      paymentProvider === "stripe" || paymentProvider === "asaas"
        ? paymentProvider
        : undefined,
    stripeCustomerId: data?.stripeCustomerId as string | undefined,
    stripeSubscriptionId: data?.stripeSubscriptionId as string | undefined,
    asaasCustomerId: data?.asaasCustomerId as string | undefined,
    asaasSubscriptionId: data?.asaasSubscriptionId as string | undefined,
    currentPeriodEnd: toDate(data?.currentPeriodEnd as Timestamp | undefined),
    trialEndsAt: toDate(data?.trialEndsAt as Timestamp | undefined),
  };
}

export function toDate(value: Timestamp | Date | undefined): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  return value.toDate();
}

function mapMemberSecurity(
  data: Record<string, unknown> | undefined,
): Member["security"] {
  if (!data) return undefined;
  const lastVerified = data.lastTwoFactorVerifiedAt;
  return {
    twoFactorEnabled: data.twoFactorEnabled === true,
    twoFactorMethod:
      data.twoFactorMethod === "email" ? "email" : undefined,
    twoFactorPending: data.twoFactorPending === true,
    requireTwoFactorOnNextLogin: data.requireTwoFactorOnNextLogin === true,
    lastTwoFactorVerifiedAt:
      lastVerified instanceof Timestamp ? lastVerified.toDate() : undefined,
  };
}

export function mapMember(snap: QueryDocumentSnapshot<DocumentData>): Member {
  const data = snap.data();
  const security = mapMemberSecurity(
    data.security as Record<string, unknown> | undefined,
  );
  return {
    companyId: data.companyId,
    email: data.email,
    role: normalizeRole(data.role as string | undefined),
    ...(data.security ? { security } : {}),
  };
}

export function mapCompany(
  snap: QueryDocumentSnapshot<DocumentData>,
): Company {
  const data = snap.data();
  return {
    id: snap.id,
    name: data.name,
    ownerId: data.ownerId,
    avgServiceTimeMin: data.avgServiceTimeMin ?? 10,
    toleranceEnabled: data.toleranceEnabled ?? false,
    toleranceMin: data.toleranceMin ?? 5,
    defaultLocale: data.defaultLocale === "en" ? "en" : "pt-BR",
    billingCountry:
      data.billingCountry === "BR" || data.billingCountry === "US"
        ? data.billingCountry
        : undefined,
    billingMarket:
      data.billingMarket === "BR" || data.billingMarket === "US"
        ? data.billingMarket
        : undefined,
    subscription: mapSubscription(data.subscription as Record<string, unknown> | undefined),
    platformControl: mapPlatformControl(
      data.platformControl as Record<string, unknown> | undefined,
    ),
    legal: mapLegal(data.legal as Record<string, unknown> | undefined),
    contactWhatsapp:
      typeof data.contactWhatsapp === "string"
        ? data.contactWhatsapp.replace(/\D/g, "") || undefined
        : undefined,
    brand: data.brand
      ? {
          accentColor: data.brand.accentColor,
          logoUrl: data.brand.logoUrl,
          tagline: data.brand.tagline,
        }
      : undefined,
    createdAt: toDate(data.createdAt) ?? new Date(),
  };
}

export function mapClient(snap: QueryDocumentSnapshot<DocumentData>): Client {
  const data = snap.data();
  return {
    id: snap.id,
    name: data.name,
    whatsapp: data.whatsapp,
    normalizedWhatsapp: data.normalizedWhatsapp,
    normalizedName: data.normalizedName,
    visitCount: data.visitCount ?? 0,
    createdAt: toDate(data.createdAt) ?? new Date(),
    lastVisitAt: toDate(data.lastVisitAt) ?? new Date(),
  };
}

export function mapQueueEntry(
  snap: QueryDocumentSnapshot<DocumentData>,
): QueueEntry {
  const data = snap.data();
  return {
    id: snap.id,
    clientId: data.clientId,
    clientName: data.clientName,
    clientWhatsapp: data.clientWhatsapp,
    status: data.status,
    position: data.position,
    ticketNumber: data.ticketNumber,
    createdAt: toDate(data.createdAt) ?? new Date(),
    startedAt: toDate(data.startedAt),
    completedAt: toDate(data.completedAt),
    location: data.location,
    estimatedWaitMin: data.estimatedWaitMin,
    publicToken: data.publicToken,
    turnStartedAt: toDate(data.turnStartedAt),
    toleranceExpiresAt: toDate(data.toleranceExpiresAt),
    spotOfferStatus: data.spotOfferStatus as SpotOfferStatus | undefined,
  };
}

function mapSpotOffer(data: Record<string, unknown> | undefined): SpotOffer | undefined {
  if (!data || typeof data.vacancyId !== "string") return undefined;
  const status = data.status as SpotOfferStatus | undefined;
  if (status !== "pending" && status !== "accepted" && status !== "declined") {
    return undefined;
  }
  return {
    vacancyId: data.vacancyId,
    status,
    expiresAt: toDate(data.expiresAt as Timestamp | undefined),
  };
}

export function mapQueueVacancy(
  snap: DocumentSnapshot<DocumentData>,
): QueueVacancy | null {
  if (!snap.exists()) return null;
  const data = snap.data();
  const reason = data.reason as VacancyReason | undefined;
  const validReasons: VacancyReason[] = [
    "tolerance_expired",
    "no_show",
    "manual",
    "client_cancelled",
  ];
  const currentOfferRaw = data.currentOffer as Record<string, unknown> | undefined;
  let currentOffer: QueueVacancy["currentOffer"];
  if (
    currentOfferRaw &&
    typeof currentOfferRaw.entryId === "string" &&
    typeof currentOfferRaw.publicToken === "string"
  ) {
    currentOffer = {
      entryId: currentOfferRaw.entryId,
      publicToken: currentOfferRaw.publicToken,
      clientName: (currentOfferRaw.clientName as string) ?? "",
      offeredAt: toDate(currentOfferRaw.offeredAt as Timestamp | undefined) ?? new Date(),
      expiresAt: toDate(currentOfferRaw.expiresAt as Timestamp | undefined),
    };
  }

  return {
    active: data.active === true,
    createdAt: toDate(data.createdAt as Timestamp | undefined) ?? new Date(),
    reason: reason && validReasons.includes(reason) ? reason : "manual",
    removedEntryId: data.removedEntryId as string | undefined,
    declinedEntryIds: Array.isArray(data.declinedEntryIds)
      ? (data.declinedEntryIds as string[])
      : [],
    currentOffer,
    filledEntryId: data.filledEntryId as string | undefined,
    closedAt: toDate(data.closedAt as Timestamp | undefined),
  };
}

export function mapPublicQueueSnapshot(
  snap: DocumentSnapshot<DocumentData>,
): PublicQueueSnapshot {
  const data = snap.data() ?? {};
  return {
    token: snap.id,
    companyId: data.companyId,
    entryId: data.entryId,
    status: data.status,
    position: data.position,
    estimatedWaitMin: data.estimatedWaitMin ?? 0,
    companyName: data.companyName,
    companyTagline: data.companyTagline,
    avgServiceTimeMin: data.avgServiceTimeMin ?? 10,
    toleranceEnabled: data.toleranceEnabled,
    toleranceMin: data.toleranceMin,
    toleranceExpiresAt: toDate(data.toleranceExpiresAt),
    brandAccent: data.brandAccent,
    brandLogoUrl: data.brandLogoUrl,
    locale: data.locale === "en" ? "en" : "pt-BR",
    clientName: data.clientName,
    companyContactWhatsapp: data.companyContactWhatsapp,
    clientId: data.clientId as string | undefined,
    spotOffer: mapSpotOffer(data.spotOffer as Record<string, unknown> | undefined),
    updatedAt: toDate(data.updatedAt),
  };
}
