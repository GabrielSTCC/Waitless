"use client";

import Link from "next/link";
import { useEffect } from "react";
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { SolutionKeywordLinks } from "@/components/landing/SolutionKeywordLinks";
import { landingContainer, landingPageBg } from "@/components/landing/landing-layout";
import { useLocale, useTranslations } from "@/components/providers/LocaleProvider";
import { SOLUTION_HUB } from "@/lib/marketing/solutions";
import type { Locale } from "@/lib/i18n/types";
import { cn } from "@/lib/utils/cn";

interface SolutionsHubPageProps {
  pageLocale: Locale;
}

export function SolutionsHubPage({ pageLocale }: SolutionsHubPageProps) {
  const { t } = useTranslations("solutionsHub");
  const { setLocale } = useLocale();

  useEffect(() => {
    setLocale(pageLocale);
  }, [pageLocale, setLocale]);

  const alternatePath =
    pageLocale === "en" ? SOLUTION_HUB.pathPt : SOLUTION_HUB.pathEn;

  return (
    <div className={cn("flex min-h-dvh flex-col", landingPageBg)}>
      <LandingNav showLogo />
      <main id="main-content" className="flex-1 pt-[calc(env(safe-area-inset-top,0px)+4.5rem)]">
        <div className={cn(landingContainer, "py-12 sm:py-16")}>
          <div className="mx-auto max-w-3xl text-center md:mx-0 md:text-left">
            <h1 className="font-heading text-3xl font-bold tracking-tight text-on-surface sm:text-4xl lg:text-5xl">
              {t("pageTitle")}
            </h1>
            <p className="mt-4 text-base leading-relaxed text-on-surface-variant sm:text-lg">
              {t("pageSubtitle")}
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-4 md:justify-start">
              <Link
                href="/admin/auth?mode=signup"
                className="inline-flex rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-on-primary shadow-surface-raised transition-[filter] hover:brightness-95"
              >
                {t("viewAllSolutions")}
              </Link>
              <Link
                href="/"
                className="text-sm font-medium text-on-surface-variant transition-colors hover:text-on-surface"
              >
                {t("backHome")}
              </Link>
              <Link
                href={alternatePath}
                className="text-sm font-medium text-primary transition-colors hover:brightness-110"
              >
                {t("alternateLocaleLabel")}
              </Link>
            </div>
          </div>

          <div className="mt-14">
            <SolutionKeywordLinks group="all" variant="grid" pageLocale={pageLocale} />
          </div>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
