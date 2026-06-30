"use client";

import type { QueueEntry } from "@/lib/types";
import { useTranslations } from "@/components/providers/LocaleProvider";

interface AssignVacancyModalProps {
  open: boolean;
  waiting: QueueEntry[];
  busy: boolean;
  onAssign: (entryId: string) => void;
  onClose: () => void;
}

export function AssignVacancyModal({
  open,
  waiting,
  busy,
  onAssign,
  onClose,
}: AssignVacancyModalProps) {
  const { t } = useTranslations("queue");

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="max-h-[80vh] w-full max-w-md overflow-hidden rounded-2xl border border-outline-variant bg-surface-container shadow-xl">
        <div className="border-b border-outline-variant px-4 py-3">
          <h2 className="font-semibold text-on-surface">{t("vacancy.assignTitle")}</h2>
          <p className="mt-1 text-xs text-on-surface-variant">{t("vacancy.assignSubtitle")}</p>
        </div>
        <ul className="max-h-64 overflow-y-auto">
          {waiting.map((entry, index) => (
            <li key={entry.id}>
              <button
                type="button"
                disabled={busy}
                onClick={() => onAssign(entry.id)}
                className="flex w-full items-center justify-between border-b border-outline-variant/50 px-4 py-3 text-left transition-colors last:border-0 hover:bg-surface-container-high disabled:opacity-50"
              >
                <div>
                  <p className="font-medium text-on-surface">{entry.clientName}</p>
                  <p className="text-xs text-on-surface-variant">
                    {t("vacancy.position", { position: index + 1 })}
                  </p>
                </div>
                <span className="text-xs font-medium text-primary">{t("vacancy.select")}</span>
              </button>
            </li>
          ))}
        </ul>
        <div className="border-t border-outline-variant p-3">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="w-full rounded-lg border border-outline-variant py-2 text-sm font-medium text-on-surface-variant hover:bg-surface-container-high"
          >
            {t("vacancy.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
