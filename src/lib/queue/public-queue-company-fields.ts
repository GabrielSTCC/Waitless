import { estimateWaitMin } from "@/lib/utils/queue-estimate";
import type { Company } from "@/lib/types";

export const DEFAULT_BRAND_ACCENT = "#FF6600";

export interface PublicQueueCompanyFields {
  companyName: string;
  companyTagline: string;
  brandAccent: string;
  brandLogoUrl: string;
  avgServiceTimeMin: number;
  toleranceEnabled: boolean;
  toleranceMin: number;
  locale: string;
  companyContactWhatsapp: string;
  estimatedWaitMin?: number;
}

export function buildPublicQueueCompanyFields(
  company: Company,
  position?: number,
): PublicQueueCompanyFields {
  const fields: PublicQueueCompanyFields = {
    companyName: company.name,
    companyTagline: company.brand?.tagline ?? "",
    brandAccent: company.brand?.accentColor ?? DEFAULT_BRAND_ACCENT,
    brandLogoUrl: company.brand?.logoUrl ?? "",
    avgServiceTimeMin: company.avgServiceTimeMin,
    toleranceEnabled: company.toleranceEnabled,
    toleranceMin: company.toleranceMin,
    locale: company.defaultLocale,
    companyContactWhatsapp: company.contactWhatsapp ?? "",
  };

  if (position !== undefined) {
    fields.estimatedWaitMin = estimateWaitMin(position, company.avgServiceTimeMin);
  }

  return fields;
}
