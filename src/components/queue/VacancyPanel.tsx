"use client";

import { useState } from "react";
import { AlertTriangle, UserPlus, X } from "lucide-react";
import type { QueueEntry, QueueVacancy } from "@/lib/types";
import {
  assignVacancyManually,
  closeVacancy,
  offerSpotToNextWaiting,
} from "@/lib/firebase/vacancy";
import { useTranslations } from "@/components/providers/LocaleProvider";
import { AssignVacancyModal } from "./AssignVacancyModal";

interface VacancyPanelProps {
  companyId: string;
  vacancy: QueueVacancy;
  waiting: QueueEntry[];
}

export function VacancyPanel({ companyId, vacancy, waiting }: VacancyPanelProps) {
  const { t } = useTranslations("queue");
  const [assignOpen, setAssignOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleOfferNext() {
    setBusy(true);
    try {
      await offerSpotToNextWaiting(companyId);
    } finally {
      setBusy(false);
    }
  }

  async function handleClose() {
    setBusy(true);
    try {
      await closeVacancy(companyId);
    } finally {
      setBusy(false);
    }
  }

  async function handleAssign(entryId: string) {
    setBusy(true);
    try {
      await assignVacancyManually(companyId, entryId);
      setAssignOpen(false);
    } finally {
      setBusy(false);
    }
  }

  const offerName = vacancy.currentOffer?.clientName;

  return (
    <>
      <div className="mb-6 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-on-surface">{t("vacancy.title")}</h3>
            <p className="mt-1 text-sm text-on-surface-variant">{t("vacancy.subtitle")}</p>
            {offerName && (
              <p className="mt-2 text-sm font-medium text-on-surface">
                {t("vacancy.currentOffer", { name: offerName })}
              </p>
            )}
            {!offerName && waiting.length > 0 && (
              <p className="mt-2 text-sm text-on-surface-variant">{t("vacancy.noOffer")}</p>
            )}
            {waiting.length === 0 && (
              <p className="mt-2 text-sm text-on-surface-variant">{t("vacancy.emptyQueue")}</p>
            )}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || waiting.length === 0}
            onClick={handleOfferNext}
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-on-primary disabled:opacity-50"
          >
            {t("vacancy.offerNext")}
          </button>
          <button
            type="button"
            disabled={busy || waiting.length === 0}
            onClick={() => setAssignOpen(true)}
            className="inline-flex items-center gap-1 rounded-lg border border-outline-variant px-3 py-1.5 text-xs font-medium text-on-surface hover:bg-surface-container-high disabled:opacity-50"
          >
            <UserPlus className="h-3.5 w-3.5" />
            {t("vacancy.assignManual")}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={handleClose}
            className="inline-flex items-center gap-1 rounded-lg border border-outline-variant px-3 py-1.5 text-xs font-medium text-on-surface-variant hover:bg-surface-container-high disabled:opacity-50"
          >
            <X className="h-3.5 w-3.5" />
            {t("vacancy.close")}
          </button>
        </div>
      </div>

      <AssignVacancyModal
        open={assignOpen}
        waiting={waiting}
        busy={busy}
        onAssign={handleAssign}
        onClose={() => setAssignOpen(false)}
      />
    </>
  );
}
