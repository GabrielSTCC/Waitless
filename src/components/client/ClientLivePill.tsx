"use client";

import { motion } from "framer-motion";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";
import { useClientTranslations } from "@/components/providers/LocaleProvider";
import type { Locale } from "@/lib/types";
import { glassChipDark } from "@/lib/utils/brand-surface";
import { cn } from "@/lib/utils/cn";

interface ClientLivePillProps {
  connected: boolean;
  accentColor?: string;
  className?: string;
  locale?: Locale;
}

export function ClientLivePill({ connected, className, locale = "pt-BR" }: ClientLivePillProps) {
  const reducedMotion = useReducedMotion();
  const t = useClientTranslations(locale);

  return (
    <div className={cn("flex justify-center px-4", className)}>
      <div
        className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5"
        style={glassChipDark()}
      >
        <motion.div
          animate={
            reducedMotion
              ? { opacity: connected ? 1 : 0.5 }
              : connected
                ? { scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }
                : { opacity: 0.45 }
          }
          transition={reducedMotion ? undefined : { repeat: Infinity, duration: 2 }}
          className={cn(
            "h-2 w-2 rounded-full",
            connected
              ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.7)]"
              : "bg-white/40",
          )}
        />
        <span className="text-[11px] font-semibold tracking-wide text-white">
          {connected ? t("client.liveRealtime") : t("client.reconnecting")}
        </span>
      </div>
    </div>
  );
}
