"use client";

import { useEffect } from "react";
import { useAuth } from "@/lib/context/AuthContext";
import { useLocale } from "@/components/providers/LocaleProvider";
import { DEFAULT_LOCALE } from "@/lib/i18n/types";

export function LocaleAuthSync() {
  const { user, company } = useAuth();
  const { setAuthenticated, setCompanyDefaultLocale } = useLocale();

  useEffect(() => {
    setAuthenticated(!!user);
    setCompanyDefaultLocale(company?.defaultLocale ?? DEFAULT_LOCALE);
  }, [user, company, setAuthenticated, setCompanyDefaultLocale]);

  return null;
}
