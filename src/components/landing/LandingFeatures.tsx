"use client";

import { MessageCircle, Palette, Radio, UsersRound } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslations } from "@/components/providers/LocaleProvider";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";
import { surfaceCard } from "@/lib/ui/surface";
import { cn } from "@/lib/utils/cn";
import { landingContainer, landingSectionAccent, landingSectionIntro } from "@/components/landing/landing-layout";

const FEATURES = [
  { key: "featureRealtime", icon: Radio },
  { key: "featureWhatsapp", icon: MessageCircle },
  { key: "featureCrm", icon: UsersRound },
  { key: "featureWhitelabel", icon: Palette },
] as const;

export function LandingFeatures() {
  const { t } = useTranslations("landing");
  const reducedMotion = useReducedMotion();

  return (
    <section className={cn("relative py-16 sm:py-20", landingSectionAccent)}>
      <div className={landingContainer}>
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className={landingSectionIntro}
        >
          <h2 className="font-heading text-3xl font-bold tracking-tight text-on-surface sm:text-4xl">
            {t("featuresTitle")}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-on-surface-variant sm:text-lg">
            {t("featuresSubtitle")}
          </p>
        </motion.div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 sm:gap-6 lg:gap-8">
          {FEATURES.map(({ key, icon: Icon }, index) => (
            <motion.article
              key={key}
              initial={reducedMotion ? false : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.45, delay: index * 0.08 }}
              className={cn(
                surfaceCard,
                "relative overflow-hidden p-6 sm:p-7",
                index % 2 === 1
                  ? "border-primary/25 bg-gradient-to-br from-primary-container/35 to-surface-container"
                  : "border-brand-navy/10 bg-surface-container/95",
              )}
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <h3 className="font-heading text-lg font-semibold text-on-surface">
                {t(`${key}Title`)}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-on-surface-variant sm:text-base">
                {t(`${key}Desc`)}
              </p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
