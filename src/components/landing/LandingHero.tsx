"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import type { RefObject } from "react";
import { useSyncExternalStore } from "react";
import { LOGO_LIGHT_SRC, LOGO_SRC, Logo } from "@/components/brand/Logo";
import { ShaderAnimation } from "@/components/ui/shader-animation";
import { useLocale, useTranslations } from "@/components/providers/LocaleProvider";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";
import { cn } from "@/lib/utils/cn";
import { landingContainer } from "@/components/landing/landing-layout";

function useMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

const ClientQueuePreview = dynamic(
  () =>
    import("@/components/preview/ClientQueuePreview").then((m) => ({
      default: m.ClientQueuePreview,
    })),
  {
    loading: () => (
      <div className="flex min-h-full items-center justify-center bg-background">
        <div className="h-40 w-40 animate-pulse rounded-3xl bg-surface-container-high/60" />
      </div>
    ),
  },
);

const IPhoneMockup = dynamic(
  () => import("@/components/preview/IPhoneMockup").then((m) => ({ default: m.IPhoneMockup })),
  {
    loading: () => (
      <div className="mx-auto h-[520px] w-[340px] animate-pulse rounded-[2.75rem] bg-surface-container-high" />
    ),
  },
);

interface LandingHeroProps {
  heroLogoRef?: RefObject<HTMLDivElement | null>;
  onScrollToSteps?: () => void;
}

export function LandingHero({ heroLogoRef, onScrollToSteps }: LandingHeroProps) {
  const { t } = useTranslations("landing");
  const { locale } = useLocale();
  const reducedMotion = useReducedMotion();
  const mounted = useMounted();
  const { resolvedTheme } = useTheme();
  const isDark = mounted && resolvedTheme === "dark";

  return (
    <section className="relative isolate overflow-hidden bg-transparent">
      <div className="pointer-events-none absolute inset-0 z-0">
        <ShaderAnimation className="absolute inset-0" animate={!reducedMotion} />
        <div className="absolute inset-0 bg-gradient-to-b from-background/10 via-transparent to-background/30 dark:from-brand-navy/20 dark:to-surface-dim/40" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/12 via-transparent to-primary/[0.03] dark:from-surface-dim/25 dark:to-primary/[0.08]" />
      </div>

      <div className={cn(landingContainer, "relative z-10 pt-[calc(env(safe-area-inset-top,0px)+3.25rem)]")}>
        <motion.div
          ref={heroLogoRef}
          initial={reducedMotion ? false : { opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="flex justify-center pt-2 pb-3 md:justify-start md:pt-3 md:pb-4 lg:pb-5"
        >
          <Link href="/" className="inline-flex shrink-0" aria-label="Waitless">
            <Logo
              variant="hero"
              className="mx-0 h-auto max-h-32 w-auto max-w-[340px] object-contain object-center sm:max-h-40 sm:max-w-[420px] md:max-h-48 md:max-w-[520px] md:object-left lg:max-h-56 lg:max-w-[580px] xl:max-h-60 xl:max-w-[640px]"
            />
          </Link>
        </motion.div>

        <div className="grid gap-8 pb-12 md:grid-cols-[1.05fr_0.95fr] md:items-start md:gap-8 md:pb-16 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12 xl:gap-16 xl:pb-20">
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="flex flex-col items-center text-center md:items-start md:text-left"
        >
          <h1 className="font-heading text-4xl font-bold leading-tight tracking-tight text-on-surface sm:text-5xl lg:text-[3.25rem] lg:leading-[1.1]">
            {t("heroHeadline")}
          </h1>

          <p className="mt-5 max-w-xl text-base leading-relaxed text-on-surface-variant sm:text-lg md:max-w-2xl lg:max-w-none">
            {t("heroSubheadline")}
          </p>

          <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
            <Link
              href="/admin/auth?mode=signup"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-on-primary shadow-surface-raised transition-[filter] hover:brightness-95"
            >
              {t("heroCtaPrimary")}
              <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
            </Link>

            <button
              type="button"
              onClick={onScrollToSteps}
              className="inline-flex items-center justify-center rounded-xl border border-outline-variant bg-surface-container/80 px-6 py-3 text-sm font-medium text-on-surface shadow-surface-input transition-colors hover:bg-surface-container-high"
            >
              {t("heroCtaSecondary")}
            </button>
          </div>
        </motion.div>

        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: "easeOut" }}
          className={cn(
            "relative flex justify-center md:-mt-20 md:justify-end lg:-mt-28 lg:pr-2 xl:-mt-36 xl:pr-0",
          )}
        >
          <div className="relative">
            <div className="pointer-events-none absolute -inset-8 rounded-full bg-primary/15 blur-3xl" />
            <IPhoneMockup size="lg" floating={!reducedMotion}>
              <ClientQueuePreview
                name={t("previewCompany")}
                tagline={t("previewTagline")}
                accentColor="#FF6600"
                logoUrl={isDark ? LOGO_LIGHT_SRC : LOGO_SRC}
                avgServiceTimeMin={12}
                samplePosition={3}
                compact={false}
                locale={locale}
                dark={isDark}
              />
            </IPhoneMockup>
          </div>
        </motion.div>
        </div>
      </div>
    </section>
  );
}
