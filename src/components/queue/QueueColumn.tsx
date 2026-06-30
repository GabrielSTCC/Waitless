"use client";

import { memo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Clock, Hourglass, PlayCircle } from "lucide-react";
import type { QueueEntry, QueueVacancy } from "@/lib/types";
import { useNow } from "@/lib/hooks/useNow";
import { useTranslations } from "@/components/providers/LocaleProvider";
import { WaitingCard } from "./WaitingCard";
import { InServiceCard } from "./InServiceCard";
import { InServiceDetailsModal } from "./InServiceDetailsModal";

interface QueueColumnProps {
  variant: "waiting" | "in_service";
  entries: QueueEntry[];
  avgServiceTimeMin: number;
  toleranceEnabled?: boolean;
  toleranceMin?: number;
  companyId?: string;
  companyName?: string;
  vacancy?: QueueVacancy | null;
  onStart?: (entryId: string) => void;
  onFinish?: (entryId: string) => void;
  onAssignVacancy?: (entryId: string) => void;
  operationsDisabled?: boolean;
}

function QueueColumnComponent({
  variant,
  entries,
  avgServiceTimeMin,
  toleranceEnabled = false,
  toleranceMin = 5,
  companyId,
  companyName,
  vacancy,
  onStart,
  onFinish,
  onAssignVacancy,
  operationsDisabled = false,
}: QueueColumnProps) {
  const { t } = useTranslations("queue");
  const isWaiting = variant === "waiting";
  const HeaderIcon = isWaiting ? Clock : PlayCircle;
  const now = useNow(!isWaiting && entries.length > 0);
  const [detailsEntry, setDetailsEntry] = useState<QueueEntry | null>(null);

  return (
    <section className="flex flex-col">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-md ${
              isWaiting ? "bg-surface-container-high text-outline" : "bg-primary/15 text-primary"
            }`}
          >
            <HeaderIcon className="h-4 w-4" strokeWidth={2} />
          </div>
          <h3 className="text-base font-semibold text-on-surface">
            {isWaiting ? t("waiting") : t("inService")}
          </h3>
        </div>
        <span
          className={`min-w-[1.75rem] rounded-full px-2 py-0.5 text-center text-xs font-semibold tabular-nums ${
            isWaiting
              ? "bg-surface-container-high text-on-surface-variant"
              : "bg-primary/15 text-primary"
          }`}
        >
          {entries.length}
        </span>
      </div>

      <div
        className={`custom-scrollbar relative flex min-h-[200px] max-h-[calc(100vh-240px)] flex-col gap-2 overflow-y-auto rounded-2xl border p-3 shadow-surface-card ${
          isWaiting
            ? "border-outline-variant bg-surface-container"
            : "border-primary/25 bg-surface-container"
        }`}
      >
        {!isWaiting && (
          <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-b from-primary/[0.04] to-transparent" />
        )}
        <AnimatePresence mode="popLayout">
          {isWaiting
            ? entries.map((entry, index) => (
                <WaitingCard
                  key={entry.id}
                  entry={entry}
                  displayPosition={index + 1}
                  isFirst={index === 0}
                  avgServiceTimeMin={avgServiceTimeMin}
                  toleranceEnabled={toleranceEnabled}
                  toleranceMin={toleranceMin}
                  companyId={companyId}
                  companyName={companyName}
                  vacancyActive={vacancy?.active === true}
                  onStart={operationsDisabled ? () => {} : onStart!}
                  onAssignVacancy={operationsDisabled ? undefined : onAssignVacancy}
                  operationsDisabled={operationsDisabled}
                />
              ))
            : entries.map((entry, index) => (
                <InServiceCard
                  key={entry.id}
                  entry={entry}
                  now={now}
                  primary={index === 0}
                  onFinish={operationsDisabled ? () => {} : onFinish!}
                  operationsDisabled={operationsDisabled}
                  onDetails={setDetailsEntry}
                />
              ))}
        </AnimatePresence>
        {!isWaiting && (
          <InServiceDetailsModal
            entry={detailsEntry}
            now={now}
            onClose={() => setDetailsEntry(null)}
          />
        )}
        {entries.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-10">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-container-high/80">
              {isWaiting ? (
                <Hourglass className="h-5 w-5 text-outline" strokeWidth={1.75} />
              ) : (
                <PlayCircle className="h-5 w-5 text-outline" strokeWidth={1.75} />
              )}
            </div>
            <p className="max-w-[200px] text-center text-sm leading-relaxed text-on-surface-variant">
              {isWaiting ? t("emptyWaiting") : t("emptyInService")}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

export const QueueColumn = memo(QueueColumnComponent);
