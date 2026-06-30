"use client";

import { Timer, X } from "lucide-react";
import type { QueueEntry } from "@/lib/types";
import { formatElapsed, formatWhatsappDisplay, normalizeWhatsapp } from "@/lib/utils/format";

interface InServiceDetailsModalProps {
  entry: QueueEntry | null;
  now: number;
  onClose: () => void;
}

export function InServiceDetailsModal({ entry, now, onClose }: InServiceDetailsModalProps) {
  if (!entry) return null;

  const elapsed = entry.startedAt
    ? formatElapsed(now - entry.startedAt.getTime())
    : "00:00";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl border border-outline-variant bg-surface-container p-5 shadow-surface-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <h3 className="font-semibold text-on-surface">Detalhes do atendimento</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-lg p-1 text-on-surface-variant hover:bg-surface-container-high"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <dl className="flex flex-col gap-3 text-sm">
          <div>
            <dt className="text-on-surface-variant">Cliente</dt>
            <dd className="font-medium text-on-surface">{entry.clientName}</dd>
          </div>
          <div>
            <dt className="text-on-surface-variant">WhatsApp</dt>
            <dd className="text-on-surface">
              {formatWhatsappDisplay(normalizeWhatsapp(entry.clientWhatsapp))}
            </dd>
          </div>
          <div>
            <dt className="text-on-surface-variant">Ticket</dt>
            <dd className="text-on-surface">#{entry.ticketNumber}</dd>
          </div>
          <div className="flex items-center gap-2">
            <Timer className="h-4 w-4 text-on-surface-variant" />
            <span className="font-mono text-on-surface">{elapsed}</span>
            <span className="text-on-surface-variant">em atendimento</span>
          </div>
        </dl>
      </div>
    </div>
  );
}
