"use client";

import { forwardRef } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "@/components/providers/LocaleProvider";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";
import { cn } from "@/lib/utils/cn";
import { landingContainer, landingSectionIntro, landingSectionSteps } from "@/components/landing/landing-layout";

const STEPS = ["step1", "step2", "step3"] as const;

export const LandingSteps = forwardRef<HTMLElement>(function LandingSteps(_, ref) {
  const { t } = useTranslations("landing");
  const reducedMotion = useReducedMotion();

  return (
    <section ref={ref} id="how-it-works" className={cn("py-16 sm:py-20", landingSectionSteps)}>
      <div className={landingContainer}>
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className={landingSectionIntro}
        >
          <h2 className="font-heading text-3xl font-bold tracking-tight text-on-surface sm:text-4xl">
            {t("stepsTitle")}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-on-surface-variant sm:text-lg">
            {t("stepsSubtitle")}
          </p>
        </motion.div>

        <ol className="relative mt-12 grid gap-8 md:grid-cols-3 md:gap-8 lg:gap-12">
          <div
            aria-hidden
            className="pointer-events-none absolute left-[10%] right-[10%] top-7 hidden h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent md:block lg:left-[6%] lg:right-[6%]"
          />

          {STEPS.map((step, index) => (
            <motion.li
              key={step}
              initial={reducedMotion ? false : { opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.45, delay: index * 0.1 }}
              className="relative flex flex-col items-center text-center md:items-start md:text-left"
            >
              <span
                className={cn(
                  "relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl",
                  "bg-primary font-heading text-xl font-bold text-on-primary shadow-surface-raised",
                )}
              >
                {index + 1}
              </span>
              <h3 className="mt-5 font-heading text-lg font-semibold text-on-surface">
                {t(`${step}Title`)}
              </h3>
              <p className="mt-2 max-w-xs text-sm leading-relaxed text-on-surface-variant sm:text-base md:max-w-sm lg:max-w-none">
                {t(`${step}Desc`)}
              </p>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
});
