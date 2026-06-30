import type { Firestore } from "firebase-admin/firestore";
import type { Auth } from "firebase-admin/auth";
import { getEffectivePlanId } from "@/lib/billing/plan-limits";
import type {
  BillingMarket,
  CompanyMember,
  CompanySubscription,
  MemberRole,
  PlatformCompanySummary,
  PlatformControl,
  PlatformControlStatus,
  SubscriptionStatus,
} from "@/lib/types";

function toDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value;
  }
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }
  if (typeof (value as { toDate?: () => Date }).toDate === "function") {
    const date = (value as { toDate: () => Date }).toDate();
    return date instanceof Date && !Number.isNaN(date.getTime()) ? date : undefined;
  }
  return undefined;
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
    stripeCustomerId: data?.stripeCustomerId as string | undefined,
    stripeSubscriptionId: data?.stripeSubscriptionId as string | undefined,
    currentPeriodEnd: toDate(data?.currentPeriodEnd),
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
    updatedAt: toDate(data.updatedAt),
    updatedBy: typeof data.updatedBy === "string" ? data.updatedBy : undefined,
  };
}

async function countCollection(db: Firestore, path: string): Promise<number> {
  const snap = await db.collection(path).count().get();
  return snap.data().count;
}

async function countQueueWaiting(db: Firestore, companyId: string): Promise<number> {
  const snap = await db
    .collection(`companies/${companyId}/queue`)
    .where("status", "==", "waiting")
    .count()
    .get();
  return snap.data().count;
}

export interface CompanyListFilters {
  search?: string;
  subscriptionStatus?: SubscriptionStatus;
  platformStatus?: PlatformControlStatus | "past_due";
  plan?: string;
  page?: number;
  pageSize?: number;
}

export interface CompanyDetail extends PlatformCompanySummary {
  legal?: { cnpj?: string; legalName?: string };
  billingUsage?: { monthKey?: string; completedCount?: number };
  members: CompanyMember[];
}

export async function buildCompanySummary(
  db: Firestore,
  auth: Auth,
  companyId: string,
  data: FirebaseFirestore.DocumentData,
): Promise<PlatformCompanySummary> {
  const ownerId = data.ownerId as string;
  const [clientCount, memberCount, queueWaiting, ownerUser] = await Promise.all([
    countCollection(db, `companies/${companyId}/clients`),
    db
      .collection("members")
      .where("companyId", "==", companyId)
      .count()
      .get()
      .then((snap) => snap.data().count),
    countQueueWaiting(db, companyId),
    auth.getUser(ownerId).catch(() => null),
  ]);

  const subscription = mapSubscription(data.subscription as Record<string, unknown> | undefined);
  const platformControl = mapPlatformControl(
    data.platformControl as Record<string, unknown> | undefined,
  );

  return {
    id: companyId,
    name: data.name as string,
    ownerId,
    ownerEmail: ownerUser?.email ?? undefined,
    createdAt: toDate(data.createdAt) ?? new Date(),
    subscription,
    platformControl,
    clientCount,
    memberCount,
    queueWaiting,
    billingMarket:
      data.billingMarket === "BR" || data.billingMarket === "US"
        ? (data.billingMarket as BillingMarket)
        : undefined,
  };
}

export async function listCompanies(
  db: Firestore,
  auth: Auth,
  filters: CompanyListFilters = {},
): Promise<{ companies: PlatformCompanySummary[]; total: number; page: number; pageSize: number }> {
  const pageSize = Math.min(filters.pageSize ?? 20, 50);
  const page = Math.max(filters.page ?? 1, 1);

  const snap = await db.collection("companies").orderBy("createdAt", "desc").get();

  let summaries = await Promise.all(
    snap.docs.map((doc) => buildCompanySummary(db, auth, doc.id, doc.data())),
  );

  if (filters.search) {
    const q = filters.search.toLowerCase();
    summaries = summaries.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.ownerEmail?.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q),
    );
  }

  if (filters.subscriptionStatus) {
    summaries = summaries.filter(
      (c) => (c.subscription?.status ?? "none") === filters.subscriptionStatus,
    );
  }

  if (filters.platformStatus === "past_due") {
    summaries = summaries.filter((c) => c.subscription?.status === "past_due");
  } else if (filters.platformStatus) {
    summaries = summaries.filter(
      (c) => (c.platformControl?.status ?? "active") === filters.platformStatus,
    );
  }

  if (filters.plan) {
    summaries = summaries.filter((c) => {
      const effective = getEffectivePlanId({
        id: c.id,
        name: c.name,
        ownerId: c.ownerId,
        avgServiceTimeMin: 10,
        toleranceEnabled: false,
        toleranceMin: 5,
        defaultLocale: "pt-BR",
        subscription: c.subscription,
        createdAt: c.createdAt,
      });
      return effective === filters.plan;
    });
  }

  const total = summaries.length;
  const start = (page - 1) * pageSize;
  const companies = summaries.slice(start, start + pageSize);

  return { companies, total, page, pageSize };
}

export async function getCompanyDetail(
  db: Firestore,
  auth: Auth,
  companyId: string,
): Promise<CompanyDetail | null> {
  const companySnap = await db.doc(`companies/${companyId}`).get();
  if (!companySnap.exists) return null;

  const data = companySnap.data()!;
  const summary = await buildCompanySummary(db, auth, companyId, data);

  const membersSnap = await db
    .collection("members")
    .where("companyId", "==", companyId)
    .get();

  const members: CompanyMember[] = membersSnap.docs.map((doc) => {
    const memberData = doc.data();
    const role = memberData.role as MemberRole | undefined;
    return {
      userId: doc.id,
      companyId: memberData.companyId,
      email: memberData.email,
      role:
        role === "owner" || role === "admin" || role === "base" ? role : "base",
    };
  });

  const billingSnap = await db.doc(`companies/${companyId}/meta/billing`).get();
  const billingData = billingSnap.data();

  const legal = data.legal as { cnpj?: string; legalName?: string } | undefined;

  return {
    ...summary,
    legal: legal?.cnpj || legal?.legalName ? legal : undefined,
    billingUsage: billingData
      ? {
          monthKey: billingData.monthKey as string | undefined,
          completedCount: billingData.completedCount as number | undefined,
        }
      : undefined,
    members,
  };
}
