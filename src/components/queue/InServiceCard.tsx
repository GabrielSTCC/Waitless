"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Timer } from "lucide-react";
import type { QueueEntry } from "@/lib/types";
import { formatElapsed, formatTime } from "@/lib/utils/format";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";

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
}: InServiceCardProps) {
  const reducedMotion = useReducedMotion();
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
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onDetails?.(entry)}
            className="flex-1 rounded-lg border border-outline-variant/60 bg-surface-container-high py-2 text-xs font-medium text-on-surface transition-colors hover:bg-surface-container-highest"
          >
            Detalhes
          </button>
          <button
            type="button"
            onClick={() => onFinish(entry.id)}
            disabled={operationsDisabled}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary py-2 text-xs font-medium text-on-primary transition-colors hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} />
            Finalizar
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
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-container-highest text-sm font-semibold text-on-surface-variant">
            {initial}
          </div>
          <div className="min-w-0 flex flex-col">
            <span className="truncate font-semibold text-on-surface">{entry.clientName}</span>
            <span className="text-xs text-on-surface-variant">Ticket #{entry.ticketNumber}</span>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="font-mono text-xs text-on-surface-variant">
            {entry.startedAt ? formatTime(entry.startedAt) : "—"}
          </span>
          <button
            type="button"
            onClick={() => onFinish(entry.id)}
            disabled={operationsDisabled}
            className="text-xs font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-50"
          >
            Finalizar
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export const InServiceCard = memo(InServiceCardComponent);
