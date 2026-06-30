import { isCompanyOperationallyBlocked } from "@/lib/permissions";
import type { Company } from "@/lib/types";
import { isPaidPlanTier } from "@/lib/billing/plans";

export const TRIAL_DAYS = 14;

const PAID_ACTIVE_STATUSES = ["active", "trialing", "past_due"] as const;

export class TrialExpiredError extends Error {
  code = "trial_expired" as const;

  constructor(message = "Período de teste encerrado. Assine um plano para continuar operando a fila.") {
    super(message);
    this.name = "TrialExpiredError";
  }
}

export function hasPaidSubscriptionData(
  subscription: { status?: string; planId?: string } | undefined,
): boolean {
  if (!subscription) return false;
  const { status, planId } = subscription;
  return (
    PAID_ACTIVE_STATUSES.includes(status as (typeof PAID_ACTIVE_STATUSES)[number]) &&
    isPaidPlanTier(planId)
  );
}

export function hasPaidSubscription(company: Company | null | undefined): boolean {
  return hasPaidSubscriptionData(company?.subscription);
}

export function getTrialEndsAt(company: Company | null | undefined): Date | undefined {
  return company?.subscription?.trialEndsAt;
}

/** Signup trial: has trialEndsAt and no paid subscription. */
export function isSignupTrial(company: Company | null | undefined): boolean {
  if (!company?.subscription?.trialEndsAt) return false;
  return !hasPaidSubscription(company);
}

export function isTrialActive(company: Company | null | undefined): boolean {
  const endsAt = getTrialEndsAt(company);
  if (!endsAt || !isSignupTrial(company)) return false;
  return endsAt.getTime() > Date.now();
}

export function isTrialExpired(company: Company | null | undefined): boolean {
  const endsAt = getTrialEndsAt(company);
  if (!endsAt || hasPaidSubscription(company)) return false;
  return endsAt.getTime() <= Date.now();
}

export function canOperateQueue(company: Company | null | undefined): boolean {
  if (!company) return false;
  if (isCompanyOperationallyBlocked(company)) return false;
  if (isTrialExpired(company)) return false;
  return true;
}

export function assertCanOperateQueue(company: Company | null | undefined): void {
  if (!canOperateQueue(company)) {
    throw new TrialExpiredError();
  }
}

export function getTrialDaysRemaining(company: Company | null | undefined): number {
  const endsAt = getTrialEndsAt(company);
  if (!endsAt || !isSignupTrial(company)) return 0;
  const diffMs = endsAt.getTime() - Date.now();
  if (diffMs <= 0) return 0;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export function computeTrialEndsAt(from: Date = new Date()): Date {
  const endsAt = new Date(from);
  endsAt.setDate(endsAt.getDate() + TRIAL_DAYS);
  return endsAt;
}
