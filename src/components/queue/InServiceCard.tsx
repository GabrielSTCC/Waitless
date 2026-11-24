"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Timer } from "lucide-react";
import type { QueueEntry } from "@/lib/types";
import { formatElapsed, formatTime } from "@/lib/utils/format";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";
import { useTranslations } from "@/components/providers/LocaleProvider";

interface InServiceCardProps {
  entry: QueueEntry;
  now: number;
  primary?: boolean;
  onFinish: (entryId: string) => void;
  onDetails?: (entry: QueueEntry) => void;
  operationsDisabled?: boolean;
}

function InServiceCardComponent({
  entry,
  now,
  primary = false,
  onFinish,
  onDetails,
  operationsDisabled = false,
}: Readonly<InServiceCardProps>) {
  const reducedMotion = useReducedMotion();
  const { t } = useTranslations("queue");
  const elapsed = entry.startedAt
    ? formatElapsed(now - entry.startedAt.getTime())
    : "00:00";

  const initial = entry.clientName.charAt(0).toUpperCase();

  const motionProps = reducedMotion
    ? {}
    : {
        layout: true as const,
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
      };

  if (primary) {
    return (
      <motion.div
        {...motionProps}
        className="relative z-10 rounded-xl border border-primary/30 bg-surface-container p-4 shadow-surface-card hover:shadow-surface-card-hover"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/15 text-base font-semibold text-primary">
              {initial}
            </div>
            <div className="min-w-0 flex flex-col">
              <span className="truncate font-semibold text-on-surface">{entry.clientName}</span>
              <span className="text-xs text-on-surface-variant">Ticket #{entry.ticketNumber}</span>
            </div>
          </div>
          <span className="flex shrink-0 items-center gap-1 rounded-lg bg-surface-container-highest px-2 py-1 font-mono text-xs text-on-surface-variant">
            <Timer className="h-3.5 w-3.5" strokeWidth={2} />
            {elapsed}
          </span>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => onDetails?.(entry)}
            className="flex min-h-11 flex-1 items-center justify-center rounded-lg border border-outline-variant/60 bg-surface-container-high px-3 text-sm font-medium text-on-surface transition-colors hover:bg-surface-container-highest"
          >
            {t("details")}
          </button>
          <button
            type="button"
            onClick={() => onFinish(entry.id)}
            disabled={operationsDisabled}
            className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-on-primary transition-colors hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CheckCircle2 className="h-4 w-4" strokeWidth={2} />
            {t("finish")}
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      {...motionProps}
      className="relative z-10 rounded-xl border border-outline-variant/50 bg-surface-container p-3.5 opacity-90 shadow-surface-card transition-all hover:opacity-100 hover:shadow-surface-card-hover"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-container-highest text-sm font-semibold text-on-surface-variant sm:h-9 sm:w-9">
            {initial}
          </div>
          <div className="min-w-0 flex flex-col">
            <span className="truncate font-semibold text-on-surface">{entry.clientName}</span>
            <span className="text-xs text-on-surface-variant">Ticket #{entry.ticketNumber}</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center justify-between gap-3 sm:flex-col sm:items-end sm:gap-2">
          <span className="font-mono text-xs text-on-surface-variant">
            {entry.startedAt ? formatTime(entry.startedAt) : "—"}
          </span>
          <button
            type="button"
            onClick={() => onFinish(entry.id)}
            disabled={operationsDisabled}
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary/10 px-4 text-sm font-medium text-primary transition-colors hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-9"
          >
            {t("finish")}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export const InServiceCard = memo(InServiceCardComponent);
