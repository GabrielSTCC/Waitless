"use client";

import Link from "next/link";
import { useTranslations } from "@/components/providers/LocaleProvider";
import { SOLUTION_HUB, SOLUTIONS } from "@/lib/marketing/solutions";
import { landingContainer, landingSectionWarm } from "@/components/landing/landing-layout";
import { cn } from "@/lib/utils/cn";

const SEGMENTS = [
  { id: "clinica" as const, labelKey: "segmentClinica" },
  { id: "salao" as const, labelKey: "segmentSalao" },
  { id: "restaurante" as const, labelKey: "segmentRestaurante" },
] as const;

export function LandingSolutions() {
  const { t, locale } = useTranslations("landing");
  const hubPath = locale === "en" ? SOLUTION_HUB.pathEn : SOLUTION_HUB.pathPt;

  return (
    <section className={cn("py-16 sm:py-20", landingSectionWarm)}>
      <div className={landingContainer}>
        <div className="mx-auto max-w-2xl text-center md:mx-0 md:max-w-3xl md:text-left">
          <h2 className="font-heading text-3xl font-bold tracking-tight text-on-surface sm:text-4xl">
            {t("segmentTitle")}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-on-surface-variant sm:text-lg">
            {t("segmentSubtitle")}
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {SEGMENTS.map(({ id, labelKey }) => {
            const solution = SOLUTIONS[id];
            const href = locale === "en" ? solution.pathEn : solution.pathPt;
            return (
              <Link
                key={id}
                href={href}
                className="group rounded-2xl border border-primary/20 bg-surface-container/90 p-6 transition-colors hover:border-primary/40 hover:bg-primary-container/20"
              >
                <h3 className="font-heading text-lg font-semibold text-on-surface group-hover:text-primary">
                  {t(labelKey)}
                </h3>
              </Link>
            );
          })}
        </div>

        <div className="mt-8 text-center md:text-left">
          <Link
            href={hubPath}
            className="text-sm font-semibold text-primary transition-colors hover:brightness-110"
          >
            {t("segmentViewAll")} →
          </Link>
        </div>
      </div>
    </section>
  );
}
