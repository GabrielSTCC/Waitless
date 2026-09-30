"use client";

import { useCallback, useEffect, useState } from "react";
import { getSessionLocale, setSessionLocale } from "@/lib/i18n/locale-storage";
import type { Locale } from "@/lib/i18n/types";

export function useClientLocale(defaultLocale: Locale) {
  const [locale, setLocale] = useState<Locale>(() => {
    if (typeof window === "undefined") return defaultLocale;
    return getSessionLocale() ?? defaultLocale;
  });

  useEffect(() => {
    setLocale(getSessionLocale() ?? defaultLocale);
  }, [defaultLocale]);

  const persistLocale = useCallback((next: Locale) => {
    setSessionLocale(next);
    setLocale(next);
  }, []);

  return { locale, setLocale: persistLocale };
}
