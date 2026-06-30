"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ShieldAlert } from "lucide-react";
import { useTranslations } from "@/components/providers/LocaleProvider";
import { useAuth } from "@/lib/context/AuthContext";
import {
  dismissProtectionAdvisory,
  isAdminProtectedPath,
  isProtectionAdvisoryDismissed,
  shouldShowProtectionAdvisory,
} from "@/lib/admin/protection-advisory";

export function ProtectionAdvisory() {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const { t } = useTranslations("common");
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const onAdminPath = isAdminProtectedPath(pathname);
  const monitorAdmin = onAdminPath && !loading && !!user;
  const advisoryEnabled =
    typeof window !== "undefined" &&
    shouldShowProtectionAdvisory(window.location.hostname);

  useEffect(() => {
    setMounted(true);
    if (!isProtectionAdvisoryDismissed()) {
      setOpen(true);
    }
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    setExpanded(false);
  }, []);

  const handleDismiss = useCallback(() => {
    dismissProtectionAdvisory();
    handleClose();
  }, [handleClose]);

  const handleLearnMore = useCallback(() => {
    setExpanded(true);
  }, []);

  const handleToggle = useCallback(() => {
    setOpen((current) => {
      if (current) {
        setExpanded(false);
        return false;
      }
      return true;
    });
  }, []);

  if (!mounted || !monitorAdmin || !advisoryEnabled) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3">
      <AnimatePresence>
        {open ? (
          <motion.aside
            key="protection-advisory"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            role="dialog"
            aria-modal="false"
            aria-live="polite"
            aria-labelledby="protection-advisory-title"
            className={`pointer-events-auto w-[calc(100vw-2rem)] rounded-xl border border-amber-200 bg-amber-50/95 p-4 shadow-xl backdrop-blur-sm dark:border-amber-800 dark:bg-amber-950/95 sm:w-auto ${
              expanded ? "max-w-lg" : "max-w-sm"
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center text-sm font-bold leading-none text-amber-600 dark:text-amber-400"
                aria-hidden="true"
              >
                !
              </div>
              <div className="min-w-0 flex-1">
                <h2
                  id="protection-advisory-title"
                  className="text-sm font-semibold text-amber-900 dark:text-amber-100"
                >
                  {t("protectionAdvisoryTitle")}
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-amber-800 dark:text-amber-200">
                  {t("protectionAdvisorySummary")}
                </p>
                <AnimatePresence initial={false}>
                  {expanded ? (
                    <motion.div
                      key="details"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 space-y-2 text-xs leading-relaxed text-amber-800 dark:text-amber-200">
                        <p>{t("protectionAdvisoryDetailsIntro")}</p>
                        <ul className="list-disc space-y-1 pl-4">
                          <li>{t("protectionAdvisoryDetailBrave")}</li>
                          <li>{t("protectionAdvisoryDetailUblock")}</li>
                          <li>{t("protectionAdvisoryDetailReload")}</li>
                        </ul>
                        <p>{t("protectionAdvisoryDetailsOutro")}</p>
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleDismiss}
                    className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 dark:bg-amber-500 dark:text-amber-950"
                  >
                    {t("protectionAdvisoryGotIt")}
                  </button>
                  {!expanded ? (
                    <button
                      type="button"
                      onClick={handleLearnMore}
                      className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-medium text-amber-900 transition-opacity hover:opacity-80 dark:border-amber-700 dark:text-amber-100"
                    >
                      {t("protectionAdvisoryLearnMore")}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </motion.aside>
        ) : null}
      </AnimatePresence>

      <button
        type="button"
        onClick={handleToggle}
        aria-label={open ? t("protectionAdvisoryCloseHelp") : t("protectionAdvisoryOpenHelp")}
        aria-expanded={open}
        aria-controls="protection-advisory-title"
        className={`pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full border shadow-lg transition-all hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 ${
          open
            ? "border-amber-400 bg-amber-600 text-white dark:border-amber-500 dark:bg-amber-500 dark:text-amber-950"
            : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200"
        }`}
      >
        <ShieldAlert className="h-5 w-5" aria-hidden="true" />
      </button>
    </div>
  );
}
