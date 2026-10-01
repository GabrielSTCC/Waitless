"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import type { ReactNode } from "react";
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
  liveSlot?: ReactNode;
}

export function ClientHeader({
  companyName,
  tagline,
  logoUrl,
  accentColor,
  compact = false,
  dark = false,
  locale = "pt-BR",
  liveSlot,
}: Readonly<ClientHeaderProps>) {
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

  if (compact) {
    return (
      <header className="px-4 pb-3 pt-4 md:px-6 md:pt-6 lg:px-8">
        <motion.div
          {...textMotion}
          className="flex items-center gap-3 rounded-2xl px-3 py-3 md:gap-4 md:px-4 lg:px-5 lg:py-3.5"
          style={heroPanel(accent, dark)}
        >
          <motion.div
            {...logoMotion}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl md:h-14 md:w-14"
            style={glassPedestal(accent, dark)}
          >
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt=""
                width={48}
                height={48}
                className="h-9 w-9 rounded-lg object-contain md:h-10 md:w-10"
                unoptimized
              />
            ) : (
              <span className="select-none text-xl" aria-hidden>
                ☕
              </span>
            )}
          </motion.div>

          <div className="min-w-0 flex-1">
            <h1 className="truncate font-heading text-base font-bold tracking-tight text-on-surface md:text-lg">
              {companyName}
            </h1>
            {tagline ? (
              <p className="mt-0.5 truncate text-xs text-on-surface-variant md:text-sm">
                {tagline}
              </p>
            ) : (
              <p className="mt-0.5 text-[11px] font-medium text-on-surface-variant md:text-xs">
                {t("client.experiencePreparing")}
              </p>
            )}
          </div>

          {liveSlot ? <div className="shrink-0">{liveSlot}</div> : null}
        </motion.div>
      </header>
    );
  }

  return (
    <header className="px-4 pb-5 pt-6 md:px-6 lg:px-8">
      <motion.div
        {...textMotion}
        className="mx-auto rounded-3xl px-5 py-6 text-center md:max-w-none md:px-8 lg:px-10 lg:py-8"
        style={heroPanel(accent, dark)}
      >
        <motion.div
          {...logoMotion}
          className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-2xl"
          style={glassPedestal(accent, dark)}
        >
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt=""
              width={64}
              height={64}
              className="h-16 w-16 rounded-xl object-contain"
              unoptimized
            />
          ) : (
            <span className="select-none text-3xl" aria-hidden>
              ☕
            </span>
          )}
        </motion.div>

        <h1 className="font-heading text-xl font-bold tracking-tight text-on-surface md:text-2xl">
          {companyName}
        </h1>

        {tagline && (
          <p className="mx-auto mt-1 max-w-md text-sm leading-snug text-on-surface-variant">
            {tagline}
          </p>
        )}

        <div className="mt-4 flex flex-col items-center gap-1 border-t border-on-surface/10 pt-4">
          <p
            className="text-[10px] font-bold uppercase tracking-[0.18em]"
            style={{ color: accent }}
          >
            {t("client.waitingKindly")}
          </p>
          <p className="max-w-sm text-sm font-medium text-on-surface-variant">
            {t("client.experiencePreparing")}
          </p>
          {liveSlot ? <div className="mt-3">{liveSlot}</div> : null}
        </div>
      </motion.div>
    </header>
  );
}
