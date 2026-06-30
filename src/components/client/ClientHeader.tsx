"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";
import { useClientTranslations } from "@/components/providers/LocaleProvider";
import type { Locale } from "@/lib/types";
import { glassPedestal, heroPanel } from "@/lib/utils/brand-surface";
import { cn } from "@/lib/utils/cn";

interface ClientHeaderProps {
  companyName: string;
  tagline?: string;
  logoUrl?: string;
  accentColor?: string;
  compact?: boolean;
  dark?: boolean;
  locale?: Locale;
}

export function ClientHeader({
  companyName,
  tagline,
  logoUrl,
  accentColor,
  compact = false,
  dark = false,
  locale = "pt-BR",
}: ClientHeaderProps) {
  const reducedMotion = useReducedMotion();
  const t = useClientTranslations(locale);
  const accent = accentColor ?? "var(--color-primary)";

  const logoMotion = reducedMotion
    ? {}
    : {
        initial: { opacity: 0, scale: 0.95 },
        animate: { opacity: 1, scale: 1 },
        transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const },
      };

  const textMotion = reducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 6 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.35, delay: 0.08, ease: [0.22, 1, 0.36, 1] as const },
      };

  return (
    <header className={cn("px-4", compact ? "pb-3 pt-4" : "pb-5 pt-6")}>
      <motion.div
        {...textMotion}
        className={cn("mx-auto max-w-sm rounded-3xl px-5 text-center", compact ? "py-4" : "py-6")}
        style={heroPanel(accent, dark)}
      >
        <motion.div
          {...logoMotion}
          className={cn(
            "mx-auto mb-3 flex items-center justify-center rounded-2xl",
            compact ? "h-16 w-16" : "h-20 w-20",
          )}
          style={glassPedestal(accent, dark)}
        >
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt=""
              width={64}
              height={64}
              className={cn("rounded-xl object-contain", compact ? "h-12 w-12" : "h-16 w-16")}
              unoptimized
            />
          ) : (
            <span className={cn("select-none", compact ? "text-2xl" : "text-3xl")} aria-hidden>
              ☕
            </span>
          )}
        </motion.div>

        <h1
          className={cn(
            "font-heading font-bold tracking-tight text-on-surface",
            compact ? "text-base" : "text-xl",
          )}
        >
          {companyName}
        </h1>

        {tagline && (
          <p
            className={cn(
              "mx-auto mt-1 max-w-[240px] leading-snug text-on-surface-variant",
              compact ? "text-[11px]" : "text-sm",
            )}
          >
            {tagline}
          </p>
        )}

        <div
          className={cn(
            "mt-4 flex flex-col items-center gap-1 border-t border-on-surface/10 pt-4",
            compact && "mt-3 pt-3",
          )}
        >
          <p
            className="text-[10px] font-bold uppercase tracking-[0.18em]"
            style={{ color: accent }}
          >
            {t("client.waitingKindly")}
          </p>
          <p
            className={cn(
              "max-w-[260px] font-medium text-on-surface-variant",
              compact ? "text-[11px]" : "text-sm",
            )}
          >
            {t("client.experiencePreparing")}
          </p>
        </div>
      </motion.div>
    </header>
  );
}
