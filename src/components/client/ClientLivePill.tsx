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
  /** Versão enxuta para caber no header compacto */
  dense?: boolean;
}

function pillMotion(reducedMotion: boolean, connected: boolean) {
  if (reducedMotion) return { opacity: connected ? 1 : 0.5 };
  if (connected) return { scale: [1, 1.3, 1], opacity: [1, 0.7, 1] };
  return { opacity: 0.45 };
}

export function ClientLivePill({
  connected,
  className,
  locale = "pt-BR",
  dense = false,
}: Readonly<ClientLivePillProps>) {
  const reducedMotion = useReducedMotion();
  const t = useClientTranslations(locale);

  return (
    <div className={cn(dense ? "flex" : "flex justify-center px-4", className)}>
      <div
        className={cn(
          "inline-flex items-center rounded-full",
          dense ? "gap-1.5 px-2.5 py-1" : "gap-2 px-3.5 py-1.5",
        )}
        style={glassChipDark()}
      >
        <motion.div
          animate={pillMotion(reducedMotion, connected)}
          transition={reducedMotion ? undefined : { repeat: Infinity, duration: 2 }}
          className={cn(
            "rounded-full",
            dense ? "h-1.5 w-1.5" : "h-2 w-2",
            connected
              ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.7)]"
              : "bg-white/40",
          )}
        />
        <span
          className={cn(
            "font-semibold tracking-wide text-white",
            dense ? "text-[10px]" : "text-[11px]",
          )}
        >
          {connected ? t("client.liveRealtime") : t("client.reconnecting")}
        </span>
      </div>
    </div>
  );
}
