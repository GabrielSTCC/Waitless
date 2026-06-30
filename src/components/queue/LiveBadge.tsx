"use client";

import { motion } from "framer-motion";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";
import { useTranslations } from "@/components/providers/LocaleProvider";

export function LiveBadge({ isLive }: { isLive: boolean }) {
  const reducedMotion = useReducedMotion();
  const { t } = useTranslations("queue");

  return (
    <div className="flex items-center gap-2 rounded-full border border-outline-variant bg-surface-container px-3 py-1.5">
      <motion.div
        animate={
          reducedMotion
            ? { opacity: isLive ? 1 : 0.4 }
            : isLive
              ? { scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }
              : { opacity: 0.4 }
        }
        transition={reducedMotion ? undefined : { repeat: Infinity, duration: 2 }}
        className={`h-2 w-2 rounded-full ${isLive ? "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]" : "bg-outline"}`}
      />
      <span className="text-xs font-medium text-on-surface-variant">
        {isLive ? t("live") : t("offline")}
      </span>
    </div>
  );
}
