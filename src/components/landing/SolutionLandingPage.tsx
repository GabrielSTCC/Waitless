"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ArrowRight, MessageCircle, Palette, Radio, UsersRound } from "lucide-react";
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { SolutionKeywordLinks } from "@/components/landing/SolutionKeywordLinks";
import {
  landingContainer,
  landingPageBg,
  landingSectionAccent,
  landingSectionIntro,
  landingSectionSteps,
  landingSectionWarm,
} from "@/components/landing/landing-layout";
import { useLocale, useTranslations } from "@/components/providers/LocaleProvider";
import {
  SOLUTIONS,
  getOtherSolutionIds,
  type SolutionId,
} from "@/lib/marketing/solutions";
import type { Locale } from "@/lib/i18n/types";
import { surfaceCard } from "@/lib/ui/surface";
import { cn } from "@/lib/utils/cn";

const BENEFIT_KEYS = [
  { title: "benefitRealtimeTitle", desc: "benefitRealtimeDesc", icon: Radio },
  { title: "benefitWhatsappTitle", desc: "benefitWhatsappDesc", icon: MessageCircle },
  { title: "benefitCrmTitle", desc: "benefitCrmDesc", icon: UsersRound },
  { title: "benefitWhitelabelTitle", desc: "benefitWhitelabelDesc", icon: Palette },
] as const;

const PAIN_KEYS = [
  { title: "pain1Title", desc: "pain1Desc" },
  { title: "pain2Title", desc: "pain2Desc" },
  { title: "pain3Title", desc: "pain3Desc" },
] as const;

const STEP_KEYS = [
  { title: "step1Title", desc: "step1Desc" },
  { title: "step2Title", desc: "step2Desc" },
  { title: "step3Title", desc: "step3Desc" },
] as const;

const FAQ_KEYS = [
  { q: "faqQ1", a: "faqA1" },
  { q: "faqQ2", a: "faqA2" },
  { q: "faqQ3", a: "faqA3" },
  { q: "faqQ4", a: "faqA4" },
] as const;

interface SolutionLandingPageProps {
  solutionId: SolutionId;
  pageLocale: Locale;
}

function getOtherSolutionLinkKey(
  currentId: SolutionId,
  otherId: SolutionId,
): string {
  if (currentId === "clinica") {
    return otherId === "salao" ? "otherSalao" : "otherRestaurante";
  }
  if (currentId === "salao") {
    return otherId === "clinica" ? "otherClinica" : "otherRestaurante";
  }
  return otherId === "clinica" ? "otherClinica" : "otherSalao";
}

export function SolutionLandingPage({ solutionId, pageLocale }: SolutionLandingPageProps) {
  const { setLocale } = useLocale();
  const { t } = useTranslations(`solutions.${solutionId}`);
  const otherIds = getOtherSolutionIds(solutionId);

  useEffect(() => {
    setLocale(pageLocale);
  }, [pageLocale, setLocale]);

  return (
    <div className={cn("flex min-h-dvh flex-col", landingPageBg)}>
      <LandingNav showLogo />
      <main id="main-content" className="flex-1 pt-[calc(env(safe-area-inset-top,0px)+4.5rem)]">
        <section className={cn(landingContainer, "py-12 sm:py-16")}>
          <div className={landingSectionIntro}>
            <h1 className="font-heading text-3xl font-bold tracking-tight text-on-surface sm:text-4xl lg:text-5xl">
              {t("heroHeadline")}
            </h1>
            <p className="mt-4 text-base leading-relaxed text-on-surface-variant sm:text-lg">
              {t("heroSubheadline")}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/admin/auth?mode=signup"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-on-primary shadow-surface-raised transition-[filter] hover:brightness-95"
              >
                {t("ctaButton")}
                <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
              </Link>
              <Link
                href="/planos"
                className="text-sm font-medium text-on-surface-variant transition-colors hover:text-on-surface"
              >
                {pageLocale === "en" ? "View plans" : "Ver planos"}
              </Link>
            </div>
          </div>
        </section>

        <section className={cn("py-14 sm:py-16", landingSectionWarm)}>
          <div className={landingContainer}>
            <h2 className={cn("font-heading text-2xl font-bold text-on-surface sm:text-3xl", landingSectionIntro)}>
              {t("painTitle")}
            </h2>
            <div className="mt-10 grid gap-5 sm:grid-cols-3">
              {PAIN_KEYS.map(({ title, desc }) => (
                <article key={title} className={cn(surfaceCard, "p-6")}>
                  <h3 className="font-heading text-lg font-semibold text-on-surface">{t(title)}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-on-surface-variant sm:text-base">{t(desc)}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={cn("py-14 sm:py-16", landingSectionAccent)}>
          <div className={landingContainer}>
            <h2 className={cn("font-heading text-2xl font-bold text-on-surface sm:text-3xl", landingSectionIntro)}>
              {t("benefitsTitle")}
            </h2>
            <div className="mt-10 grid gap-5 sm:grid-cols-2">
              {BENEFIT_KEYS.map(({ title, desc, icon: Icon }, index) => (
                <article
                  key={title}
                  className={cn(
                    surfaceCard,
                    "p-6 sm:p-7",
                    index % 2 === 1
                      ? "border-primary/25 bg-gradient-to-br from-primary-container/35 to-surface-container"
                      : "border-brand-navy/10 bg-surface-container/95",
                  )}
                >
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" strokeWidth={1.75} />
                  </div>
                  <h3 className="font-heading text-lg font-semibold text-on-surface">{t(title)}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-on-surface-variant sm:text-base">{t(desc)}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={cn("py-14 sm:py-16", landingSectionSteps)}>
          <div className={landingContainer}>
            <h2 className={cn("font-heading text-2xl font-bold text-on-surface sm:text-3xl", landingSectionIntro)}>
              {t("stepsTitle")}
            </h2>
            <ol className="mt-10 grid gap-6 sm:grid-cols-3">
              {STEP_KEYS.map(({ title, desc }, index) => (
                <li key={title} className={cn(surfaceCard, "relative p-6")}>
                  <span className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-on-primary">
                    {index + 1}
                  </span>
                  <h3 className="font-heading text-lg font-semibold text-on-surface">{t(title)}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-on-surface-variant sm:text-base">{t(desc)}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className={cn(landingContainer, "py-14 sm:py-16")}>
          <h2 className="font-heading text-2xl font-bold text-on-surface sm:text-3xl">{t("faqTitle")}</h2>
          <div className="mt-8 space-y-3">
            {FAQ_KEYS.map(({ q, a }) => (
              <details
                key={q}
                className={cn(surfaceCard, "group overflow-hidden")}
              >
                <summary className="cursor-pointer list-none px-5 py-4 font-medium text-on-surface marker:content-none [&::-webkit-details-marker]:hidden">
                  {t(q)}
                </summary>
                <div className="border-t border-outline-variant/40 px-5 py-4 text-sm leading-relaxed text-on-surface-variant sm:text-base">
                  {t(a)}
                </div>
              </details>
            ))}
          </div>
        </section>

        <section className={cn(landingContainer, "pb-10")}>
          <h2 className="font-heading text-xl font-semibold text-on-surface sm:text-2xl">
            {t("relatedKeywordsTitle")}
          </h2>
          <SolutionKeywordLinks
            className="mt-4"
            pageLocale={pageLocale}
            variant="inline"
            group={solutionId}
          />
        </section>

        <section className={cn(landingContainer, "pb-14")}>
          <h2 className="font-heading text-xl font-semibold text-on-surface sm:text-2xl">
            {t("otherSolutionsTitle")}
          </h2>
          <div className="mt-4 flex flex-wrap gap-3">
            {otherIds.map((otherId) => {
              const other = SOLUTIONS[otherId];
              const href = pageLocale === "en" ? other.pathEn : other.pathPt;
              return (
                <Link
                  key={otherId}
                  href={href}
                  className="inline-flex rounded-full border border-primary/25 bg-surface-container/80 px-4 py-2 text-sm font-medium text-on-surface transition-colors hover:border-primary/40 hover:bg-primary-container/30"
                >
                  {t(getOtherSolutionLinkKey(solutionId, otherId))}
                </Link>
              );
            })}
          </div>
        </section>

        <section className="py-14 sm:py-16">
          <div className={landingContainer}>
            <div className="relative overflow-hidden rounded-3xl bg-brand-navy px-6 py-12 sm:px-10 sm:py-14 lg:flex lg:items-center lg:justify-between lg:gap-10">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-transparent" />
              <div className="relative text-center lg:text-left">
                <h2 className="font-heading text-3xl font-bold tracking-tight text-[#f8f9fa] sm:text-4xl">
                  {t("ctaTitle")}
                </h2>
              </div>
              <div className="relative mt-8 flex justify-center lg:mt-0 lg:shrink-0">
                <Link
                  href="/admin/auth?mode=signup"
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-sm font-semibold text-on-primary shadow-surface-raised transition-[filter] hover:brightness-110"
                >
                  {t("ctaButton")}
                  <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}
