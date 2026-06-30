"use client";

import { memo, useState } from "react";
import { motion } from "framer-motion";
import { Check, Clock, Link2, MessageCircle, Timer, UserX, Zap } from "lucide-react";
import type { QueueEntry } from "@/lib/types";
import { normalizeWhatsapp } from "@/lib/utils/format";
import {
  buildQueuePublicUrl,
  buildVacancyWhatsAppMessage,
  buildWhatsAppQueueMessage,
} from "@/lib/utils/app-url";
import { markNoShow } from "@/lib/firebase/vacancy";
import { estimateWaitMin } from "@/lib/utils/queue-estimate";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";
import { useLocale, useTranslations } from "@/components/providers/LocaleProvider";
import { useAuth } from "@/lib/context/AuthContext";
import { usePlanLimits } from "@/lib/hooks/usePlanLimits";

interface WaitingCardProps {
  entry: QueueEntry;
  displayPosition: number;
  isFirst?: boolean;
  avgServiceTimeMin: number;
  toleranceEnabled?: boolean;
  toleranceMin?: number;
  companyId?: string;
  companyName?: string;
  vacancyActive?: boolean;
  onStart: (entryId: string) => void;
  onAssignVacancy?: (entryId: string) => void;
  operationsDisabled?: boolean;
}

function buildWhatsAppMessage(
  entry: QueueEntry,
  displayPosition: number,
  fallbackOrigin: string,
) {
  if (!entry.publicToken) {
    return `Olá ${entry.clientName}! Você está na posição ${displayPosition} da fila.`;
  }
  return buildWhatsAppQueueMessage(
    entry.clientName,
    displayPosition,
    entry.publicToken,
    fallbackOrigin,
  );
}

function formatToleranceDeadline(date: Date, locale: string): string {
  return date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
}

function WaitingCardComponent({
  entry,
  displayPosition,
  isFirst = false,
  avgServiceTimeMin,
  toleranceEnabled = false,
  toleranceMin = 5,
  companyId,
  companyName = "",
  vacancyActive = false,
  onStart,
  onAssignVacancy,
  operationsDisabled = false,
}: WaitingCardProps) {
  const [copied, setCopied] = useState(false);
  const [noShowBusy, setNoShowBusy] = useState(false);
  const reducedMotion = useReducedMotion();
  const { locale } = useLocale();
  const { t } = useTranslations("queue");
  const { user, company } = useAuth();
  const planLimits = usePlanLimits(company);
  const estimatedWaitMin = estimateWaitMin(displayPosition, avgServiceTimeMin);
  const progress = Math.min(100, Math.max(15, 100 - displayPosition * 8));
  const showTolerance =
    isFirst && toleranceEnabled && entry.toleranceExpiresAt;

  async function handleCopyLink() {
    if (!entry.publicToken) return;
    const url = buildQueuePublicUrl(entry.publicToken, window.location.origin);
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleWhatsApp() {
    const digits = normalizeWhatsapp(entry.clientWhatsapp);
    if (!digits) return;
    const origin =
      typeof window !== "undefined" ? window.location.origin : undefined;
    const msg = buildWhatsAppMessage(entry, displayPosition, origin ?? "");
    const url = `https://wa.me/55${digits}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function handleWhatsAppApi() {
    const digits = normalizeWhatsapp(entry.clientWhatsapp);
    if (!digits || !entry.publicToken || !user) return;
    const origin =
      typeof window !== "undefined" ? window.location.origin : undefined;
    const idToken = await user.getIdToken();
    await fetch("/api/whatsapp/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        to: digits,
        message: buildWhatsAppMessage(entry, displayPosition, origin ?? ""),
      }),
    });
  }

  function handleVacancyWhatsApp() {
    const digits = normalizeWhatsapp(entry.clientWhatsapp);
    if (!digits || !entry.publicToken) return;
    const origin =
      typeof window !== "undefined" ? window.location.origin : undefined;
    const msg = buildVacancyWhatsAppMessage(
      entry.clientName,
      companyName,
      entry.publicToken,
      origin,
    );
    const url = `https://wa.me/55${digits}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function handleNoShow() {
    if (!companyId) return;
    setNoShowBusy(true);
    try {
      await markNoShow(companyId, entry.id);
    } finally {
      setNoShowBusy(false);
    }
  }

  const motionProps = reducedMotion
    ? {}
    : {
        layout: true as const,
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, scale: 0.98 },
        whileHover: { scale: 1.005 },
      };

  return (
    <motion.div
      {...motionProps}
      className={`group relative overflow-hidden rounded-xl border p-3.5 shadow-surface-card transition-shadow hover:shadow-surface-card-hover ${
        vacancyActive && entry.spotOfferStatus === "pending"
          ? "border-amber-500/50 bg-amber-500/5"
          : "border-outline-variant/50 bg-surface-container hover:border-outline-variant"
      }`}
    >
      <div className="absolute left-0 top-0 h-full w-0.5 bg-primary/70" />
      <div className="mb-3 flex items-start justify-between pl-2">
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold tabular-nums text-primary">
            #{String(displayPosition).padStart(2, "0")}
          </span>
          <div className="flex flex-col">
            <span className="font-semibold leading-tight text-on-surface">{entry.clientName}</span>
            <span className="mt-0.5 flex items-center gap-1 text-xs text-on-surface-variant">
              <Clock className="h-3 w-3 shrink-0" strokeWidth={2} />
              {estimatedWaitMin} min
            </span>
            {showTolerance && entry.toleranceExpiresAt && (
              <span className="mt-1 flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-300">
                <Timer className="h-3 w-3 shrink-0" strokeWidth={2} />
                {t("toleranceUntil", {
                  time: formatToleranceDeadline(entry.toleranceExpiresAt, locale),
                })}
                {toleranceMin ? ` (${toleranceMin} min)` : ""}
              </span>
            )}
            {entry.spotOfferStatus === "pending" && (
              <span className="mt-1 text-xs font-medium text-amber-700 dark:text-amber-300">
                {t("vacancyOfferPending")}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="pl-2">
        <div className="h-1 w-full overflow-hidden rounded-full bg-surface-container-highest">
          <div
            className="h-1 rounded-full bg-primary/80 transition-all duration-1000"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] text-on-surface-variant">{t("estimatedWaitLabel")}</span>
          <div className="flex flex-wrap items-center gap-1.5">
            {isFirst && companyId && planLimits.canUseTolerance && (
              <button
                type="button"
                disabled={noShowBusy}
                onClick={handleNoShow}
                title={t("noShowTitle")}
                className="flex items-center gap-1 rounded-md border border-on-error-container/35 bg-error-container px-2 py-1 text-[11px] font-semibold text-on-error-container shadow-surface-input transition-colors hover:brightness-95 disabled:opacity-50 dark:border-error/45 dark:bg-error-container/25 dark:text-error dark:hover:bg-error-container/40"
              >
                <UserX className="h-3 w-3" strokeWidth={2} />
                {t("noShow")}
              </button>
            )}
            {vacancyActive && onAssignVacancy && planLimits.canUseTolerance && (
              <button
                type="button"
                onClick={() => onAssignVacancy(entry.id)}
                title={t("assignVacancyTitle")}
                className="flex items-center gap-1 rounded-md border border-primary/40 px-2 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-primary/10"
              >
                <Zap className="h-3 w-3" strokeWidth={2} />
                {t("assignVacancy")}
              </button>
            )}
            {vacancyActive && (
              <button
                type="button"
                onClick={handleVacancyWhatsApp}
                title={t("vacancyWhatsAppTitle")}
                className="flex items-center gap-1 rounded-md border border-outline-variant/40 px-2 py-1 text-[11px] font-medium text-on-surface-variant transition-colors hover:bg-surface-container-high"
              >
                <MessageCircle className="h-3 w-3" strokeWidth={2} />
                {t("vacancyWhatsApp")}
              </button>
            )}
            <button
              type="button"
              disabled={!entry.publicToken}
              onClick={handleCopyLink}
              title={entry.publicToken ? t("copyLinkTitle") : t("linkUnavailable")}
              aria-label={t("copyLinkTitle")}
              className="flex items-center gap-1 rounded-md border border-outline-variant/40 px-2 py-1 text-[11px] font-medium text-on-surface-variant transition-colors hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-50"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 text-primary" strokeWidth={2} />
                  {t("linkCopied")}
                </>
              ) : (
                <>
                  <Link2 className="h-3 w-3" strokeWidth={2} />
                  {t("copyLink")}
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleWhatsApp}
              title={t("sendWhatsApp")}
              aria-label={t("sendWhatsApp")}
              className="flex items-center gap-1 rounded-md border border-outline-variant/40 px-2 py-1 text-[11px] font-medium text-on-surface-variant transition-colors hover:bg-surface-container-high"
            >
              <MessageCircle className="h-3 w-3" strokeWidth={2} />
              {t("whatsapp")}
            </button>
            {process.env.NEXT_PUBLIC_WHATSAPP_API_ENABLED === "true" &&
              planLimits.canUseWhatsappApi && (
              <button
                type="button"
                onClick={handleWhatsAppApi}
                className="rounded-md bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary"
              >
                API
              </button>
            )}
            <button
              type="button"
              onClick={() => onStart(entry.id)}
              disabled={operationsDisabled}
              className="rounded-md bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t("start")}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export const WaitingCard = memo(WaitingCardComponent);
