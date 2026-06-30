import { FieldValue, Timestamp, type Firestore } from "firebase-admin/firestore";
import { PLAN_TIERS, type PlanTier } from "@/lib/billing/plans";
import type { SubscriptionStatus } from "@/lib/types";

const PAID_STATUSES: SubscriptionStatus[] = ["active", "trialing", "past_due"];
const FREE_STATUSES: SubscriptionStatus[] = ["active", "canceled", "none"];

export interface PlatformSubscriptionOverrideInput {
  planId: PlanTier;
  status?: SubscriptionStatus;
  reason?: string;
  trialEndsAt?: Date | null;
}

export interface PlatformSubscriptionOverrideResult {
  previousPlanId: string;
  newPlanId: PlanTier;
  previousStatus: SubscriptionStatus;
  newStatus: SubscriptionStatus;
}

function isPlanTier(value: string): value is PlanTier {
  return (PLAN_TIERS as readonly string[]).includes(value);
}

function isSubscriptionStatus(value: string): value is SubscriptionStatus {
  return (
    value === "none" ||
    value === "trialing" ||
    value === "active" ||
    value === "past_due" ||
    value === "canceled"
  );
}

function resolveStatus(planId: PlanTier, status?: SubscriptionStatus): SubscriptionStatus {
  if (planId === "free") {
    if (status && FREE_STATUSES.includes(status)) return status;
    return "active";
  }

  if (status && PAID_STATUSES.includes(status)) return status;
  return "active";
}

export function parsePlatformSubscriptionOverride(body: {
  planId?: unknown;
  status?: unknown;
  reason?: unknown;
  trialEndsAt?: unknown;
}): PlatformSubscriptionOverrideInput {
  const planIdRaw = typeof body.planId === "string" ? body.planId.trim() : "";
  if (!isPlanTier(planIdRaw)) {
    throw new Error("Plano inválido.");
  }

  const statusRaw = typeof body.status === "string" ? body.status.trim() : undefined;
  if (statusRaw && !isSubscriptionStatus(statusRaw)) {
    throw new Error("Status de assinatura inválido.");
  }

  const planId = planIdRaw;
  const status = resolveStatus(planId, statusRaw as SubscriptionStatus | undefined);
  const reason = typeof body.reason === "string" ? body.reason.trim() : undefined;
  const trialEndsAtRaw = body.trialEndsAt;

  let trialEndsAt: Date | null | undefined;
  if (trialEndsAtRaw === null) {
    trialEndsAt = null;
  } else if (typeof trialEndsAtRaw === "string" && trialEndsAtRaw.trim()) {
    const parsed = new Date(trialEndsAtRaw);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error("Data de fim do trial inválida.");
    }
    trialEndsAt = parsed;
  }

  return { planId, status, reason: reason || undefined, trialEndsAt };
}

export async function applyPlatformSubscriptionOverride(
  db: Firestore,
  companyId: string,
  input: PlatformSubscriptionOverrideInput,
): Promise<PlatformSubscriptionOverrideResult> {
  const companyRef = db.doc(`companies/${companyId}`);
  const companySnap = await companyRef.get();

  if (!companySnap.exists) {
    throw new Error("Empresa não encontrada.");
  }

  const data = companySnap.data()!;
  const subscription = (data.subscription as Record<string, unknown> | undefined) ?? {};
  const previousPlanId = (subscription.planId as string | undefined) ?? "free";
  const previousStatus = (subscription.status as SubscriptionStatus | undefined) ?? "none";
  const newStatus = resolveStatus(input.planId, input.status);

  const subscriptionUpdate: Record<string, unknown> = {
    ...subscription,
    planId: input.planId,
    status: newStatus,
  };

  if (input.trialEndsAt !== undefined) {
    subscriptionUpdate.trialEndsAt =
      input.trialEndsAt === null ? null : Timestamp.fromDate(input.trialEndsAt);
  }

  await companyRef.set(
    {
      subscription: subscriptionUpdate,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  return {
    previousPlanId,
    newPlanId: input.planId,
    previousStatus,
    newStatus,
  };
}
