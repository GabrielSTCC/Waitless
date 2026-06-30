import type { BillingMarket, Company, Locale } from "@/lib/types";

export type BillingCountry = "BR" | "US";

export function countryToBillingMarket(country: BillingCountry): BillingMarket {
  return country === "BR" ? "BR" : "US";
}

export function resolveBillingMarketFromCompanyData(data: {
  billingMarket?: BillingMarket;
  billingCountry?: BillingCountry;
  legal?: { cnpj?: string };
  defaultLocale?: Locale;
}): BillingMarket {
  if (data.billingMarket === "BR" || data.billingMarket === "US") {
    return data.billingMarket;
  }

  if (data.billingCountry === "BR" || data.billingCountry === "US") {
    return countryToBillingMarket(data.billingCountry);
  }

  const cnpj = data.legal?.cnpj?.replace(/\D/g, "");
  if (cnpj) return "BR";
  if (data.defaultLocale === "en") return "US";
  return "BR";
}

export function getCompanyBillingMarket(company: Company): BillingMarket {
  return resolveBillingMarketFromCompanyData({
    billingMarket: company.billingMarket,
    billingCountry: company.billingCountry,
    legal: company.legal,
    defaultLocale: company.defaultLocale,
  });
}
