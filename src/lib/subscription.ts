import { getPlanDisplayName, getPlanDisplayNameForCompany } from "@/lib/billing/plans";
import { getEffectivePlanId } from "@/lib/billing/plan-limits";
import { hasPaidSubscription } from "@/lib/billing/trial";
import type { Company, SubscriptionStatus } from "@/lib/types";

const ACTIVE_STATUSES: SubscriptionStatus[] = ["active", "trialing", "past_due"];

export { hasPaidSubscription };

export function hasActiveSubscription(company: Company): boolean {
  const status = company.subscription?.status ?? "none";
  return ACTIVE_STATUSES.includes(status);
}

export function getSubscriptionPlanLabel(
  company: Company,
  locale: "pt-BR" | "en" = "pt-BR",
): string {
  if (hasPaidSubscription(company)) {
    return getPlanDisplayName(getEffectivePlanId(company), locale);
  }
  return getPlanDisplayNameForCompany(company, locale);
}
