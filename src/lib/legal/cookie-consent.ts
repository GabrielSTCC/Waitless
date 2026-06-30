export const COOKIE_CONSENT_VERSION = "1.0";
export const COOKIE_CONSENT_STORAGE_KEY = "waitless-cookie-consent";

export type CookieCategory = "necessary" | "functional" | "analytics" | "marketing";

export interface CookieConsentState {
  version: string;
  necessary: true;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
  updatedAt: string;
}

export function createConsent(partial?: Partial<Omit<CookieConsentState, "necessary" | "version">>): CookieConsentState {
  return {
    version: COOKIE_CONSENT_VERSION,
    necessary: true,
    functional: partial?.functional ?? false,
    analytics: partial?.analytics ?? false,
    marketing: partial?.marketing ?? false,
    updatedAt: partial?.updatedAt ?? new Date().toISOString(),
  };
}

export function acceptAllConsent(): CookieConsentState {
  return createConsent({
    functional: true,
    analytics: true,
    marketing: true,
  });
}

export function rejectOptionalConsent(): CookieConsentState {
  return createConsent({
    functional: false,
    analytics: false,
    marketing: false,
  });
}

export function getStoredConsent(): CookieConsentState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CookieConsentState;
    if (parsed.version !== COOKIE_CONSENT_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function storeConsent(consent: CookieConsentState): void {
  localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(consent));
  if (!consent.functional) {
    clearFunctionalStorage();
  }
}

export function hasConsent(category: CookieCategory): boolean {
  if (category === "necessary") return true;
  const consent = getStoredConsent();
  if (!consent) return false;
  return consent[category];
}

export function canUseFunctionalStorage(): boolean {
  return hasConsent("functional");
}

const FUNCTIONAL_STORAGE_KEYS = [
  "waitless-locale-anonymous",
  "waitless-motion-pref",
  "waitless-text-scale",
  "waitless-theme",
] as const;

export function clearFunctionalStorage(): void {
  if (typeof window === "undefined") return;
  for (const key of FUNCTIONAL_STORAGE_KEYS) {
    localStorage.removeItem(key);
  }
}
