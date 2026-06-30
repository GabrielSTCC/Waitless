import type { PaidPlanTier, PlanTier } from "@/lib/billing/plans";

/** i18n keys under `pricing.*` — shared by landing and account. */
export const FREE_PLAN_FEATURE_KEYS = [
  "featureCompletions80",
  "featureStaff2",
  "featureBrandingBasic",
  "featureQueueRealtime",
  "featureWhatsappLink",
] as const;

export const PAID_PLAN_FEATURE_KEYS: Record<PaidPlanTier, readonly string[]> = {
  essential: [
    "featureCompletions600",
    "featureStaff5",
    "featureBrandingLogo",
    "featureAnalyticsBasic",
  ],
  pro: [
    "featureCompletionsUnlimited",
    "featureStaffUnlimited",
    "featureBrandingFull",
    "featureAnalyticsFull",
    "featureTolerance",
  ],
};

export function getPlanFeatureKeys(planId: PlanTier): readonly string[] {
  if (planId === "free") return FREE_PLAN_FEATURE_KEYS;
  if (planId === "essential") return PAID_PLAN_FEATURE_KEYS.essential;
  return PAID_PLAN_FEATURE_KEYS.pro;
}
