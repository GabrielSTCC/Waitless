"use client";

import { Smartphone, Users } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslations } from "@/components/providers/LocaleProvider";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";
import { surfaceCard } from "@/lib/ui/surface";
import { cn } from "@/lib/utils/cn";
import { landingContainer, landingSectionIntro, landingSectionWarm } from "@/components/landing/landing-layout";

export function LandingContrast() {
  const { t } = useTranslations("landing");
  const reducedMotion = useReducedMotion();

  return (
    <section className={cn("relative py-16 sm:py-20", landingSectionWarm)}>
      <div className={landingContainer}>
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className={landingSectionIntro}
        >
          <h2 className="font-heading text-3xl font-bold tracking-tight text-on-surface sm:text-4xl">
            {t("contrastTitle")}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-on-surface-variant sm:text-lg">
            {t("contrastSubtitle")}
          </p>
        </motion.div>

        <div className="mt-12 grid gap-6 md:grid-cols-2 md:gap-8 lg:gap-10">
          <motion.article
            initial={reducedMotion ? false : { opacity: 0, x: -16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className={cn(
              surfaceCard,
              "relative overflow-hidden border-brand-navy/15 bg-surface-container/90 p-6 sm:p-8",
            )}
          >
            <div className="pointer-events-none absolute -right-6 -top-6 h-32 w-32 rounded-full bg-on-surface-variant/5 blur-2xl" />
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-surface-container-high text-on-surface-variant">
              <Users className="h-6 w-6" strokeWidth={1.75} />
            </div>
            <h3 className="font-heading text-xl font-semibold text-on-surface">
              {t("contrastBeforeTitle")}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-on-surface-variant sm:text-base">
              {t("contrastBeforeDesc")}
            </p>
          </motion.article>

          <motion.article
            initial={reducedMotion ? false : { opacity: 0, x: 16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className={cn(
              surfaceCard,
              "relative overflow-hidden border-primary/35 bg-gradient-to-br from-primary-container/40 to-surface-container p-6 shadow-surface-raised sm:p-8",
            )}
          >
            <div className="pointer-events-none absolute -right-4 -top-4 h-36 w-36 rounded-full bg-primary/15 blur-2xl" />
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Smartphone className="h-6 w-6" strokeWidth={1.75} />
            </div>
            <h3 className="font-heading text-xl font-semibold text-on-surface">
              {t("contrastAfterTitle")}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-on-surface-variant sm:text-base">
              {t("contrastAfterDesc")}
            </p>
          </motion.article>
        </div>
      </div>
    </section>
  );
}
