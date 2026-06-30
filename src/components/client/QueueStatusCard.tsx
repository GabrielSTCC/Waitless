"use client";

import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Clock, PartyPopper, Sparkles, TimerOff } from "lucide-react";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";
import { useClientTranslations } from "@/components/providers/LocaleProvider";
import type { Locale, PublicQueueStatus } from "@/lib/types";
import { deepBrandCard, deepGlassOverlay, glassChip } from "@/lib/utils/brand-surface";
import { QueueProgressDots } from "./QueueProgressDots";
import { ToleranceCountdown } from "./ToleranceCountdown";
import { TurnAlert } from "./TurnAlert";

interface QueueStatusCardProps {
  position: number;
  estimatedWaitMin: number;
  accentColor?: string;
  status: PublicQueueStatus;
  toleranceEnabled?: boolean;
  toleranceMin?: number;
  toleranceExpiresAt?: Date;
  locale?: Locale;
}

function DeepCardShell({
  accent,
  children,
}: {
  accent: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-4 overflow-hidden rounded-3xl" style={deepBrandCard(accent)}>
      <div className="rounded-3xl p-6" style={deepGlassOverlay()}>
        {children}
      </div>
    </div>
  );
}

function StatusIconCircle({ children }: { children: ReactNode }) {
  return (
    <div
      className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full"
      style={glassChip()}
    >
      {children}
    </div>
  );
}

function AnimatedPosition({ position }: { position: number }) {
  const reducedMotion = useReducedMotion();

  if (reducedMotion) {
    return (
      <p
        className="mt-1 text-center font-heading text-7xl font-bold tabular-nums leading-none text-white drop-shadow-sm"
        aria-live="polite"
      >
        {position}
      </p>
    );
  }

  return (
    <div className="relative mt-1 flex h-[5.5rem] items-center justify-center overflow-hidden">
      <AnimatePresence mode="popLayout">
        <motion.p
          key={position}
          initial={{ opacity: 0, y: 16, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.92 }}
          transition={{ type: "spring", stiffness: 380, damping: 28 }}
          className="absolute text-center font-heading text-7xl font-bold tabular-nums leading-none text-white drop-shadow-md"
          aria-live="polite"
        >
          {position}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

export function QueueStatusCard({
  position,
  estimatedWaitMin,
  accentColor,
  status,
  toleranceEnabled,
  toleranceMin,
  toleranceExpiresAt,
  locale = "pt-BR",
}: QueueStatusCardProps) {
  const t = useClientTranslations(locale);
  const accent = accentColor ?? "var(--color-primary)";
  const peopleAhead = Math.max(0, position - 1);

  if (status === "cancelled") {
    return null;
  }

  if (status === "expired") {
    return (
      <DeepCardShell accent={accent}>
        <div className="flex flex-col items-center text-center">
          <StatusIconCircle>
            <TimerOff className="h-5 w-5 text-white" strokeWidth={2} />
          </StatusIconCircle>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/90">
            {t("client.expiredLabel")}
          </p>
          <p className="mt-2 font-heading text-2xl font-bold text-white drop-shadow-sm">
            {t("client.expiredTitle")}
          </p>
          <p className="mt-2 text-sm font-medium text-white">{t("client.expiredBody")}</p>
        </div>
      </DeepCardShell>
    );
  }

  if (status === "completed") {
    return (
      <DeepCardShell accent={accent}>
        <div className="flex flex-col items-center text-center">
          <StatusIconCircle>
            <Sparkles className="h-5 w-5 text-white" strokeWidth={2} />
          </StatusIconCircle>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/90">
            {t("client.completedLabel")}
          </p>
          <p className="mt-2 font-heading text-2xl font-bold text-white drop-shadow-sm">
            {t("client.completedTitle")}
          </p>
          <p className="mt-2 text-sm font-medium text-white">{t("client.completedBody")}</p>
        </div>
      </DeepCardShell>
    );
  }

  if (status === "in_service") {
    return (
      <DeepCardShell accent={accent}>
        <div className="flex flex-col items-center text-center">
          <StatusIconCircle>
            <PartyPopper className="h-5 w-5 text-white" strokeWidth={2} />
          </StatusIconCircle>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/90">
            {t("client.inServiceLabel")}
          </p>
          <p className="mt-2 font-heading text-3xl font-bold text-white drop-shadow-sm">
            {t("client.inServiceTitle")}
          </p>
          <p className="mt-3 rounded-full px-4 py-2 text-sm font-medium text-white" style={glassChip(accent)}>
            {t("client.inServiceBody")}
          </p>
        </div>
      </DeepCardShell>
    );
  }

  const showToleranceCountdown =
    toleranceEnabled && position === 1 && toleranceExpiresAt;

  return (
    <DeepCardShell accent={accent}>
      <p className="text-center text-[10px] font-bold uppercase tracking-[0.18em] text-white/90">
        {t("client.yourPosition")}
      </p>

      <AnimatedPosition position={position} />

      <p className="mt-2 text-center text-sm font-medium text-white">
        {peopleAhead === 0
          ? t("client.nextUp")
          : peopleAhead === 1
            ? t("client.peopleAheadOne", { count: peopleAhead })
            : t("client.peopleAheadMany", { count: peopleAhead })}
      </p>

      <QueueProgressDots peopleAhead={peopleAhead} accentColor={accentColor} variant="deep" />

      {showToleranceCountdown && (
        <div className="flex justify-center">
          <ToleranceCountdown
            expiresAt={toleranceExpiresAt}
            accentColor={accentColor}
            locale={locale}
          />
        </div>
      )}

      <div className="mt-8 flex flex-col items-center gap-2">
        <div
          className="inline-flex items-center gap-2 rounded-full px-4 py-2.5"
          style={glassChip(accent)}
        >
          <Clock className="h-4 w-4 text-white" strokeWidth={2.25} />
          <span className="text-sm font-semibold text-white">
            {t("client.estimatedWait", { min: estimatedWaitMin })}
          </span>
        </div>
        <p className="max-w-[260px] text-center text-[11px] leading-snug text-white/80">
          {t("client.estimateDisclaimer")}
        </p>
      </div>

      <TurnAlert
        position={position}
        accentColor={accentColor}
        toleranceEnabled={toleranceEnabled}
        toleranceMin={toleranceMin}
        locale={locale}
      />
    </DeepCardShell>
  );
}
