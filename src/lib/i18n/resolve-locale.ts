import {
  getAnonymousLocale,
  getSessionLocale,
} from "@/lib/i18n/locale-storage";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/types";

export function resolveLocale(options: {
  companyDefaultLocale?: Locale | null;
  isAuthenticated?: boolean;
}): Locale {
  const session = getSessionLocale();
  if (session) return session;

  if (options.isAuthenticated && options.companyDefaultLocale) {
    return options.companyDefaultLocale;
  }

  const anonymous = getAnonymousLocale();
  if (anonymous) return anonymous;

  return DEFAULT_LOCALE;
}
