import { hasActiveSubscription } from "@/lib/subscription";
import type { Company } from "@/lib/types";

export function canChangeBillingCountry(company: Company): boolean {
  return !hasActiveSubscription(company);
}
