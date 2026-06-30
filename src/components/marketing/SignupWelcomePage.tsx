"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, CheckCircle2, PartyPopper } from "lucide-react";
import { motion } from "framer-motion";
import { Logo } from "@/components/brand/Logo";
import { landingPageBg } from "@/components/landing/landing-layout";
import { useAuth } from "@/lib/context/AuthContext";
import { dismissTrialWelcome } from "@/lib/billing/trial-intro-storage";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";
import { hasConsent } from "@/lib/legal/cookie-consent";
import { fireLeadConversion } from "@/lib/marketing/google-ads";
import { getReturnToParam } from "@/lib/marketing/return-to";
import { consumeSignupConversionPending } from "@/lib/marketing/signup-conversion";
import { useTranslations } from "@/components/providers/LocaleProvider";
import { cn } from "@/lib/utils/cn";

const BULLET_KEYS = ["bullet1", "bullet2", "bullet3"] as const;

export function SignupWelcomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, member, company, loading } = useAuth();
  const { t } = useTranslations("marketing");
  const { t: tc } = useTranslations("common");
  const reducedMotion = useReducedMotion();
  const returnTo = getReturnToParam(searchParams);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/admin/auth");
      return;
    }

    if (!member) {
      router.replace("/admin/onboarding");
      return;
    }

    const pending = consumeSignupConversionPending();
    if (!pending) {
      router.replace(returnTo ?? "/admin");
      return;
    }

    if (hasConsent("marketing")) {
      fireLeadConversion();
    }

    setReady(true);
  }, [loading, user, member, router, returnTo]);

  function handleContinue() {
    if (company?.id) {
      dismissTrialWelcome(company.id);
    }
    router.replace(returnTo ?? "/admin");
  }

  if (loading || !ready || !company) {
    return (
      <div
        className={cn(
          "flex min-h-dvh items-center justify-center text-on-surface-variant",
          landingPageBg,
        )}
      >
        {tc("loading")}
      </div>
    );
  }

  const companyName = company.name?.trim() || t("signupWelcome.fallbackCompany");
  const title = t("signupWelcome.titleWithCompany", { company: companyName });

  const motionProps = reducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 16 },
        animate: { opacity: 1, y: 0 },
      };

  return (
    <div
      className={cn(
        "flex min-h-dvh flex-col items-center justify-center px-6 py-12",
        landingPageBg,
      )}
    >
      <motion.div
        {...motionProps}
        transition={{ duration: 0.5 }}
        className="flex w-full max-w-lg flex-col items-center text-center"
      >
        <Logo variant="hero" className="h-auto max-h-20 w-auto max-w-[220px]" />

        <motion.div
          {...(reducedMotion
            ? {}
            : {
                initial: { scale: 0.8, opacity: 0 },
                animate: { scale: 1, opacity: 1 },
                transition: { delay: 0.15, type: "spring", stiffness: 260, damping: 18 },
              })}
          className="mt-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-container text-primary shadow-sm"
          aria-hidden
        >
          <PartyPopper className="h-8 w-8" strokeWidth={1.75} />
        </motion.div>

        <h1 className="mt-6 font-heading text-2xl font-bold tracking-tight text-on-surface sm:text-3xl">
          {title}
        </h1>
        <p className="mt-3 text-base leading-relaxed text-on-surface-variant sm:text-lg">
          {t("signupWelcome.subtitle")}
        </p>

        <ul className="mt-8 w-full space-y-3 text-left">
          {BULLET_KEYS.map((key, index) => (
            <motion.li
              key={key}
              {...(reducedMotion
                ? {}
                : {
                    initial: { opacity: 0, x: -12 },
                    animate: { opacity: 1, x: 0 },
                    transition: { delay: 0.25 + index * 0.08 },
                  })}
              className="flex items-start gap-3 rounded-xl border border-primary/15 bg-surface-container/80 px-4 py-3"
            >
              <CheckCircle2
                className="mt-0.5 h-5 w-5 shrink-0 text-primary"
                aria-hidden
              />
              <span className="text-sm leading-relaxed text-on-surface sm:text-base">
                {t(`signupWelcome.${key}`)}
              </span>
            </motion.li>
          ))}
        </ul>

        <motion.button
          type="button"
          onClick={handleContinue}
          {...(reducedMotion
            ? {}
            : {
                initial: { opacity: 0, y: 8 },
                animate: { opacity: 1, y: 0 },
                transition: { delay: 0.5 },
              })}
          className="mt-10 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-base font-semibold text-on-primary shadow-sm transition-[filter] hover:brightness-110 sm:w-auto"
        >
          {t("signupWelcome.cta")}
          <ArrowRight className="h-5 w-5" aria-hidden />
        </motion.button>

        <p className="sr-only" role="status" aria-live="polite">
          {title}
        </p>
      </motion.div>
    </div>
  );
}
