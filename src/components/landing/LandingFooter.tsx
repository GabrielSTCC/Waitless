"use client";

import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { CookiePreferencesTrigger } from "@/components/legal/CookieConsentBanner";
import { landingContainer } from "@/components/landing/landing-layout";
import { useTranslations } from "@/components/providers/LocaleProvider";
import { SOLUTION_HUB, SOLUTIONS } from "@/lib/marketing/solutions";
import { getLegalConfig } from "@/lib/legal/config";
import { cn } from "@/lib/utils/cn";

export function LandingFooter() {
  const { t, locale } = useTranslations("landing");
  const year = new Date().getFullYear();
  const legal = getLegalConfig();
  const hubPath = locale === "en" ? SOLUTION_HUB.pathEn : SOLUTION_HUB.pathPt;

  const legalLinks = [
    { href: "/privacidade", label: t("footerPrivacy") },
    { href: "/termos", label: t("footerTerms") },
    { href: "/cookies", label: t("footerCookies") },
    { href: "/canal-lgpd", label: t("footerLgpd") },
    { href: "/contato", label: t("footerContact") },
  ] as const;

  return (
    <footer className="border-t border-primary/20 bg-gradient-to-r from-brand-navy/[0.06] via-primary-container/20 to-brand-navy/[0.04] py-10">
      <div className={cn(landingContainer, "flex flex-col gap-8")}>
        <div className="flex flex-col items-center gap-6 md:flex-row md:items-start md:justify-between">
          <Logo variant="compact" className="mx-0 max-w-[110px]" />

          <nav
            className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm"
            aria-label="Footer navigation"
          >
            <Link
              href="/admin/auth"
              className="text-on-surface-variant transition-colors hover:text-on-surface"
            >
              {t("footerLogin")}
            </Link>
            <Link
              href="/admin/auth?mode=signup"
              className="text-on-surface-variant transition-colors hover:text-on-surface"
            >
              {t("footerSignup")}
            </Link>
            <Link
              href="/planos"
              className="text-on-surface-variant transition-colors hover:text-on-surface"
            >
              {t("footerPlans")}
            </Link>
            <Link
              href={hubPath}
              className="text-on-surface-variant transition-colors hover:text-on-surface"
            >
              {t("footerSolutions")}
            </Link>
            <Link
              href={locale === "en" ? SOLUTIONS.clinica.pathEn : SOLUTIONS.clinica.pathPt}
              className="text-on-surface-variant transition-colors hover:text-on-surface"
            >
              {t("segmentClinica")}
            </Link>
            <Link
              href={locale === "en" ? SOLUTIONS.salao.pathEn : SOLUTIONS.salao.pathPt}
              className="text-on-surface-variant transition-colors hover:text-on-surface"
            >
              {t("segmentSalao")}
            </Link>
            <Link
              href={locale === "en" ? SOLUTIONS.restaurante.pathEn : SOLUTIONS.restaurante.pathPt}
              className="text-on-surface-variant transition-colors hover:text-on-surface"
            >
              {t("segmentRestaurante")}
            </Link>
            {legalLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="text-on-surface-variant transition-colors hover:text-on-surface"
              >
                {label}
              </Link>
            ))}
            <CookiePreferencesTrigger className="text-on-surface-variant transition-colors hover:text-on-surface">
              {t("footerCookiePrefs")}
            </CookiePreferencesTrigger>
          </nav>
        </div>

        <div className="space-y-1 text-center text-xs text-on-surface-variant md:text-left">
          <p>{t("footerLegalLine", { legalName: legal.legalName, cpf: legal.cpf })}</p>
          <p>{legal.address}</p>
          <p>
            DPO: {legal.dpoName} —{" "}
            <a href={`mailto:${legal.lgpdEmail}`} className="underline hover:text-on-surface">
              {legal.lgpdEmail}
            </a>
          </p>
          <p>{t("footerCopyright", { year: String(year) })}</p>
        </div>
      </div>
    </footer>
  );
}
