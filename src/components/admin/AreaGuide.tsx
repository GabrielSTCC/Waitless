"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { CircleHelp, X } from "lucide-react";
import { useAdminFloatingHelpersOptional } from "@/components/admin/admin-floating-helpers-context";
import { useTranslations } from "@/components/providers/LocaleProvider";
import { useAuth } from "@/lib/context/AuthContext";
import {
  markAreaGuideSeen,
  resolveAreaId,
  shouldAutoOpenAreaGuide,
  type AreaGuideId,
} from "@/lib/admin/area-guide";
import { isAdminProtectedPath } from "@/lib/admin/protection-advisory";
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

export function AreaGuide() {
  const pathname = usePathname();
  const { user, company, loading } = useAuth();
  const { t } = useTranslations("areaGuide");
  const reducedMotion = useReducedMotion();
  const floating = useAdminFloatingHelpersOptional();
  const setAreaGuideOpen = floating?.setAreaGuideOpen;
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);

  const areaId = resolveAreaId(pathname);
  const onAdminPath = isAdminProtectedPath(pathname);
  const uid = user?.uid ?? "";
  const isOwner = !!user && !!company && user.uid === company.ownerId;
  const areaAllowed = areaId !== "account" || isOwner;
  const showFab = mounted && onAdminPath && !loading && !!user && !!areaId && areaAllowed;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !uid || !areaId || !areaAllowed) {
      setOpen(false);
      setAreaGuideOpen?.(false);
      return;
    }
    if (shouldAutoOpenAreaGuide(uid, areaId)) {
      setOpen(true);
      setAreaGuideOpen?.(true);
      return;
    }
    setOpen(false);
    setAreaGuideOpen?.(false);
  }, [mounted, uid, areaId, areaAllowed, setAreaGuideOpen]);

  const closeAndMarkSeen = useCallback(() => {
    if (uid && areaId) {
      markAreaGuideSeen(uid, areaId);
    }
    setOpen(false);
    setAreaGuideOpen?.(false);
  }, [uid, areaId, setAreaGuideOpen]);

  const handleToggle = useCallback(() => {
    setOpen((current) => {
      const next = !current;
      if (!next && uid && areaId) {
        markAreaGuideSeen(uid, areaId);
      }
      setAreaGuideOpen?.(next);
      return next;
    });
  }, [uid, areaId, setAreaGuideOpen]);

  if (!showFab || !areaId) {
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
    <>
      <AnimatePresence>
        {open ? (
          <motion.aside
            key={`area-guide-${areaId}`}
            {...motionProps}
            aria-modal="false"
            aria-live="polite"
            aria-labelledby="area-guide-title"
            className="pointer-events-auto relative order-1 w-[calc(100vw-2rem)] max-w-sm rounded-xl border border-border bg-card/95 p-4 shadow-xl backdrop-blur-sm sm:w-auto"
          >
            <button
              type="button"
              onClick={closeAndMarkSeen}
              aria-label={t("close")}
              className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
            <div className="min-w-0 pr-6">
              <h2
                id="area-guide-title"
                className="text-sm font-semibold text-foreground"
              >
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

      <button
        type="button"
        onClick={handleToggle}
        aria-label={open ? t("closeHelp") : t("openHelp")}
        aria-expanded={open}
        aria-controls="area-guide-title"
        className={`pointer-events-auto order-3 flex h-12 w-12 items-center justify-center rounded-full border shadow-lg transition-all hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
          open
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-card text-foreground"
        }`}
      >
        <CircleHelp className="h-5 w-5" aria-hidden="true" />
      </button>
    </>
  );
}
