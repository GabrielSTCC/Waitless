"use client";

import { useMemo } from "react";
import {
  canUseAnalyticsLevel,
  canUseToleranceFeatures,
  canUseWhatsappApi,
  canUseWhiteLabelLevel,
  getEffectivePlanId,
  getEffectivePlanLimits,
  getMonthlyCompletionLimit,
  getStaffLimit,
} from "@/lib/billing/plan-limits";
import type { Company } from "@/lib/types";

export function usePlanLimits(company: Company | null | undefined) {
  return useMemo(() => {
    const planId = getEffectivePlanId(company);
    const limits = getEffectivePlanLimits(company);

    return {
      planId,
      limits,
      monthlyCompletionLimit: getMonthlyCompletionLimit(company),
      staffLimit: getStaffLimit(company),
      canUseBasicAnalytics: canUseAnalyticsLevel(company, "basic"),
      canUseFullAnalytics: canUseAnalyticsLevel(company, "full"),
      canUseLogoBranding: canUseWhiteLabelLevel(company, "logo"),
      canUseFullBranding: canUseWhiteLabelLevel(company, "full"),
      canUseTolerance: canUseToleranceFeatures(company),
      canUseWhatsappApi: canUseWhatsappApi(company),
    };
  }, [company]);
}
