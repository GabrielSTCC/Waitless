import {
  getPlanDefinition,
  getPlanLimits,
  type AnalyticsLevel,
  type PlanTier,
  type WhiteLabelLevel,
} from "@/lib/billing/plans";
import { hasActiveSubscription } from "@/lib/subscription";
import type { Company } from "@/lib/types";

export class PlanLimitError extends Error {
  code: "monthly_limit" | "staff_limit" | "feature_locked";

  constructor(code: PlanLimitError["code"], message: string) {
    super(message);
    this.name = "PlanLimitError";
    this.code = code;
  }
}

export function getEffectivePlanId(company: Company | null | undefined): PlanTier {
  if (!company) return "free";
  const planId = company.subscription?.planId;
  if (hasActiveSubscription(company) && (planId === "essential" || planId === "pro")) {
    return planId;
  }
  return "free";
}

export function getEffectivePlanLimits(company: Company | null | undefined) {
  return getPlanLimits(getEffectivePlanId(company));
}

export function canUseAnalyticsLevel(
  company: Company | null | undefined,
  level: AnalyticsLevel,
): boolean {
  const current = getEffectivePlanLimits(company).analytics;
  const order: AnalyticsLevel[] = ["none", "basic", "full"];
  return order.indexOf(current) >= order.indexOf(level);
}

export function canUseWhiteLabelLevel(
  company: Company | null | undefined,
  level: WhiteLabelLevel,
): boolean {
  const current = getEffectivePlanLimits(company).whiteLabel;
  const order: WhiteLabelLevel[] = ["basic", "logo", "full"];
  return order.indexOf(current) >= order.indexOf(level);
}

export function canUseToleranceFeatures(company: Company | null | undefined): boolean {
  return getEffectivePlanLimits(company).toleranceFeatures;
}

export function canUseWhatsappApi(company: Company | null | undefined): boolean {
  return getEffectivePlanLimits(company).whatsappApi;
}

export function getMonthlyCompletionLimit(company: Company | null | undefined): number | null {
  const limits = getEffectivePlanLimits(company);
  return limits.monthlyCompletions;
}

export function getFairUseCompletionLimit(company: Company | null | undefined): number | null {
  return getEffectivePlanLimits(company).fairUseCompletions;
}

export function getStaffLimit(company: Company | null | undefined): number | null {
  return getEffectivePlanLimits(company).maxStaff;
}

export function isWithinMonthlyCompletionLimit(
  company: Company | null | undefined,
  currentCount: number,
): boolean {
  const limit = getMonthlyCompletionLimit(company);
  if (limit === null) {
    const fairUse = getFairUseCompletionLimit(company);
    if (fairUse === null) return true;
    return currentCount < fairUse;
  }
  return currentCount < limit;
}

export function isWithinStaffLimit(
  company: Company | null | undefined,
  currentStaffCount: number,
): boolean {
  const limit = getStaffLimit(company);
  if (limit === null) return true;
  return currentStaffCount < limit;
}

export function assertMonthlyCompletionAllowed(
  company: Company | null | undefined,
  currentCount: number,
): void {
  if (isWithinMonthlyCompletionLimit(company, currentCount)) return;

  const planId = getEffectivePlanId(company);
  const limits = getPlanDefinition(planId).limits;
  const cap = limits.monthlyCompletions ?? limits.fairUseCompletions ?? 0;

  throw new PlanLimitError(
    "monthly_limit",
    `Limite mensal de ${cap} atendimentos atingido. Faça upgrade do plano.`,
  );
}

export function assertStaffInviteAllowed(
  company: Company | null | undefined,
  currentStaffCount: number,
): void {
  if (isWithinStaffLimit(company, currentStaffCount)) return;

  const limit = getStaffLimit(company);
  throw new PlanLimitError(
    "staff_limit",
    `Limite de ${limit} usuários atingido. Faça upgrade do plano.`,
  );
}
