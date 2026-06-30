"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  getAnonymousLocale,
  getSessionLocale,
  setAnonymousLocale,
  setSessionLocale,
} from "@/lib/i18n/locale-storage";
import {
  applyTextScale,
  getMotionPreference,
  getTextScale,
  setMotionPreference,
  setTextScale,
} from "@/lib/i18n/preferences-storage";
import { createTranslator, type Translator } from "@/lib/i18n/translator";
import {
  DEFAULT_LOCALE,
  type Locale,
  type MotionPreference,
  type TextScale,
} from "@/lib/i18n/types";

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Translator;
  isAuthenticated: boolean;
  setAuthenticated: (value: boolean) => void;
  setCompanyDefaultLocale: (locale: Locale | null) => void;
  motionPreference: MotionPreference;
  setMotionPreferencePref: (pref: MotionPreference) => void;
  textScale: TextScale;
  setTextScalePref: (scale: TextScale) => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [companyDefaultLocale, setCompanyDefaultLocale] = useState<Locale | null>(null);
  const [isAuthenticated, setAuthenticated] = useState(false);
  const [localeOverride, setLocaleOverride] = useState<Locale | null>(null);
  const [motionPreference, setMotionPreferenceState] = useState<MotionPreference>("system");
  const [textScale, setTextScaleState] = useState<TextScale>("100");

  const locale = useMemo(() => {
    if (localeOverride !== null) return localeOverride;
    if (isAuthenticated && companyDefaultLocale) {
      return companyDefaultLocale;
    }
    return DEFAULT_LOCALE;
  }, [localeOverride, companyDefaultLocale, isAuthenticated]);

  const t = useMemo(() => createTranslator(locale), [locale]);

  useEffect(() => {
    setMotionPreferenceState(getMotionPreference());
    const scale = getTextScale();
    setTextScaleState(scale);
    applyTextScale(scale);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    const sync = () => {
      setLocaleOverride(
        getSessionLocale() ?? getAnonymousLocale() ?? null,
      );
    };
    sync();
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  const setLocale = useCallback(
    (next: Locale) => {
      if (isAuthenticated) {
        setSessionLocale(next);
      } else {
        setAnonymousLocale(next);
      }
      setLocaleOverride(next);
    },
    [isAuthenticated],
  );

  const setMotionPreferencePref = useCallback((pref: MotionPreference) => {
    setMotionPreference(pref);
    setMotionPreferenceState(pref);
    window.dispatchEvent(new Event("waitless-motion-pref-change"));
  }, []);

  const setTextScalePref = useCallback((scale: TextScale) => {
    setTextScale(scale);
    setTextScaleState(scale);
  }, []);

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t,
      isAuthenticated,
      setAuthenticated,
      setCompanyDefaultLocale,
      motionPreference,
      setMotionPreferencePref,
      textScale,
      setTextScalePref,
    }),
    [
      locale,
      setLocale,
      t,
      isAuthenticated,
      motionPreference,
      setMotionPreferencePref,
      textScale,
      setTextScalePref,
    ],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocale must be used within LocaleProvider");
  }
  return ctx;
}

export function useTranslations(namespace?: string) {
  const { t, locale } = useLocale();
  const namespaced = useMemo(
    () => (key: string, params?: Record<string, string | number>) =>
      t(namespace ? `${namespace}.${key}` : key, params),
    [t, namespace],
  );
  return { t: namespaced, locale };
}

export function useClientTranslations(locale: Locale = DEFAULT_LOCALE) {
  return useMemo(() => createTranslator(locale), [locale]);
}
