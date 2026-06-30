"use client";

import { useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { useTranslations } from "@/components/providers/LocaleProvider";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";
import { landingPageBg } from "@/components/landing/landing-layout";
import { cn } from "@/lib/utils/cn";

const REDIRECT_DELAY_MS = 1500;

const PRESERVED_PARAMS = [
  "plan",
  "interval",
  "gclid",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
] as const;

export function SubscriptionLeadLoader() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslations("marketing");
  const reducedMotion = useReducedMotion();

  const accountQuery = useMemo(() => {
    const params = new URLSearchParams();
    for (const key of PRESERVED_PARAMS) {
      const value = searchParams.get(key);
      if (value) params.set(key, value);
    }
    const qs = params.toString();
    return qs ? `?${qs}` : "";
  }, [searchParams]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      router.replace(`/admin/account${accountQuery}`);
    }, REDIRECT_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [router, accountQuery]);

  return (
    <div
      className={cn(
        "flex min-h-dvh flex-col items-center justify-center px-6",
        landingPageBg,
      )}
    >
      <div className="flex w-full max-w-sm flex-col items-center text-center">
        <Logo variant="hero" className="h-auto max-h-24 w-auto max-w-[240px]" />
        <Loader2
          className={cn(
            "mt-8 h-10 w-10 text-primary",
            !reducedMotion && "animate-spin",
          )}
          aria-hidden
        />
        <h1 className="mt-6 font-heading text-xl font-semibold tracking-tight text-on-surface sm:text-2xl">
          {t("leadLoaderTitle")}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-on-surface-variant sm:text-base">
          {t("leadLoaderSubtitle")}
        </p>
        <p className="sr-only" role="status" aria-live="polite">
          {t("leadLoaderTitle")}
        </p>
      </div>
    </div>
  );
}
