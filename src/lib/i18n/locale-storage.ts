import { canUseFunctionalStorage } from "@/lib/legal/cookie-consent";
import type { Locale } from "@/lib/i18n/types";

const SESSION_KEY = "waitless-locale-session";
const ANONYMOUS_KEY = "waitless-locale-anonymous";

export function getSessionLocale(): Locale | null {
  if (typeof window === "undefined") return null;
  const value = sessionStorage.getItem(SESSION_KEY);
  return value === "en" || value === "pt-BR" ? value : null;
}

export function setSessionLocale(locale: Locale): void {
  sessionStorage.setItem(SESSION_KEY, locale);
}

export function clearSessionLocale(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

export function getAnonymousLocale(): Locale | null {
  if (typeof window === "undefined") return null;
  if (!canUseFunctionalStorage()) return null;
  const value = localStorage.getItem(ANONYMOUS_KEY);
  return value === "en" || value === "pt-BR" ? value : null;
}

export function setAnonymousLocale(locale: Locale): void {
  if (!canUseFunctionalStorage()) return;
  localStorage.setItem(ANONYMOUS_KEY, locale);
}

export function clearAnonymousLocale(): void {
  localStorage.removeItem(ANONYMOUS_KEY);
}
