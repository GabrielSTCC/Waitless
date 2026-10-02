"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CircleHelp, X } from "lucide-react";
import { useAdminFloatingHelpers } from "@/components/admin/admin-floating-helpers-context";
import { useTranslations } from "@/components/providers/LocaleProvider";
import type { AreaGuideId } from "@/lib/admin/area-guide";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";

function areaTitleKey(areaId: AreaGuideId): string {
  return `${areaId}Title`;
}

function areaSummaryKey(areaId: AreaGuideId): string {
  return `${areaId}Summary`;
}

function areaDetailKeys(areaId: AreaGuideId): string[] {
  return [`${areaId}Detail1`, `${areaId}Detail2`, `${areaId}Detail3`];
}

export function AreaGuidePanel() {
  const { t } = useTranslations("areaGuide");
  const reducedMotion = useReducedMotion();
  const { areaId, areaGuideVisible, areaGuideOpen, closeAreaGuide } =
    useAdminFloatingHelpers();

  if (!areaGuideVisible || !areaId) {
    return null;
  }

  const motionProps = reducedMotion
    ? { initial: false, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, y: 12, scale: 0.98 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: 12, scale: 0.98 },
      };

  const details = areaDetailKeys(areaId)
    .map((key) => t(key))
    .filter((text) => text && !text.startsWith("areaGuide."));

  return (
    <AnimatePresence>
      {areaGuideOpen ? (
        <motion.aside
          key={`area-guide-${areaId}`}
          {...motionProps}
          aria-modal="false"
          aria-live="polite"
          aria-labelledby="area-guide-title"
          className="pointer-events-auto relative w-[calc(100vw-2rem)] max-w-sm rounded-xl border border-border bg-card/95 p-4 shadow-xl backdrop-blur-sm sm:w-auto"
        >
          <button
            type="button"
            onClick={closeAreaGuide}
            aria-label={t("close")}
            className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
          <div className="min-w-0 pr-6">
            <h2 id="area-guide-title" className="text-sm font-semibold text-foreground">
              {t(areaTitleKey(areaId))}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {t(areaSummaryKey(areaId))}
            </p>
            {details.length > 0 ? (
              <ul className="mt-3 list-disc space-y-1 pl-4 text-xs leading-relaxed text-muted-foreground">
                {details.map((text) => (
                  <li key={text}>{text}</li>
                ))}
              </ul>
            ) : null}
          </div>
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}

export function AreaGuideFab() {
  const { t } = useTranslations("areaGuide");
  const { areaGuideVisible, areaGuideOpen, toggleAreaGuide } =
    useAdminFloatingHelpers();

  if (!areaGuideVisible) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={toggleAreaGuide}
      aria-label={areaGuideOpen ? t("closeHelp") : t("openHelp")}
      aria-expanded={areaGuideOpen}
      aria-controls="area-guide-title"
      className={`flex h-12 w-12 items-center justify-center rounded-full border shadow-lg transition-all hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 ${
        areaGuideOpen
          ? "border-sky-400 bg-sky-600 text-white dark:border-sky-500 dark:bg-sky-500 dark:text-sky-950"
          : "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-700 dark:bg-sky-950 dark:text-sky-200"
      }`}
    >
      <CircleHelp className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}
