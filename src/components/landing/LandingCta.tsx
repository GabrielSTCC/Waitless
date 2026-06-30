"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslations } from "@/components/providers/LocaleProvider";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";
import { landingContainer } from "@/components/landing/landing-layout";

export function LandingCta() {
  const { t } = useTranslations("landing");
  const reducedMotion = useReducedMotion();

  return (
    <section className="py-16 sm:py-20">
      <div className={landingContainer}>
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-3xl bg-brand-navy px-6 py-12 sm:px-10 sm:py-14 lg:flex lg:items-center lg:justify-between lg:gap-10 lg:px-14 lg:py-12 lg:text-left xl:px-16"
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-transparent" />
          <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-primary/15 blur-3xl" />

          <div className="relative text-center lg:text-left">
            <h2 className="font-heading text-3xl font-bold tracking-tight text-[#f8f9fa] sm:text-4xl">
              {t("ctaTitle")}
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-[#a8b8d0] sm:text-lg lg:mx-0 lg:max-w-xl">
              {t("ctaSubtitle")}
            </p>
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
        </motion.div>
      </div>
    </section>
  );
}
