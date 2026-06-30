declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

const ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID?.trim() ?? "";
const CONVERSION_LABEL = process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL?.trim() ?? "";

export function hasGoogleAdsId(): boolean {
  return ADS_ID.length > 0;
}

export function isGoogleAdsConfigured(): boolean {
  return hasGoogleAdsId() && CONVERSION_LABEL.length > 0;
}

export function getGoogleAdsId(): string | null {
  return ADS_ID || null;
}

export function getGoogleAdsConversionSendTo(): string | null {
  if (!isGoogleAdsConfigured()) return null;
  return `${ADS_ID}/${CONVERSION_LABEL}`;
}

export function syncGoogleAdsConsent(marketingGranted: boolean): void {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;

  const state = marketingGranted ? "granted" : "denied";
  window.gtag("consent", "update", {
    ad_storage: state,
    ad_user_data: state,
    ad_personalization: state,
    analytics_storage: state,
  });
}

export function fireLeadConversion(): void {
  if (typeof window === "undefined" || !isGoogleAdsConfigured()) return;

  const sendTo = getGoogleAdsConversionSendTo();
  if (!sendTo) return;

  const attempt = (retriesLeft: number) => {
    if (typeof window.gtag === "function") {
      window.gtag("event", "conversion", { send_to: sendTo });
      return;
    }
    if (retriesLeft > 0) {
      window.setTimeout(() => attempt(retriesLeft - 1), 200);
    }
  };

  attempt(8);
}
