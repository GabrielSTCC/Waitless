"use client";

import { useCallback, useEffect, useState } from "react";
import { getSessionLocale, setSessionLocale } from "@/lib/i18n/locale-storage";
import type { Locale } from "@/lib/i18n/types";

export function useClientLocale(defaultLocale: Locale) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window === "undefined") return defaultLocale;
    return getSessionLocale() ?? defaultLocale;
  });

  useEffect(() => {
    setLocaleState(getSessionLocale() ?? defaultLocale);
  }, [defaultLocale]);

  const setLocale = useCallback((next: Locale) => {
    setSessionLocale(next);
    setLocaleState(next);
  }, []);

  return { locale, setLocale };
}
