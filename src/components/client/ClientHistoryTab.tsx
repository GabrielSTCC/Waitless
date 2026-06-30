"use client";

import { History } from "lucide-react";
import { useClientTranslations } from "@/components/providers/LocaleProvider";
import type { ClientVisitRecord, TerminalVisitStatus } from "@/lib/client/visit-log";
import type { Locale } from "@/lib/i18n/types";
import { deepBrandCard, deepGlassOverlay } from "@/lib/utils/brand-surface";

interface ClientHistoryTabProps {
  visits: ClientVisitRecord[];
  loading: boolean;
  error: string;
  locale: Locale;
  accentColor?: string;
}

function statusKey(status: TerminalVisitStatus): string {
  return `client.history.status.${status}`;
}

function formatVisitDate(iso: string, locale: Locale): { date: string; time: string } {
  const d = new Date(iso);
  const loc = locale === "en" ? "en-US" : "pt-BR";
  return {
    date: d.toLocaleDateString(loc, { day: "2-digit", month: "short", year: "numeric" }),
    time: d.toLocaleTimeString(loc, { hour: "2-digit", minute: "2-digit" }),
  };
}

export function ClientHistoryTab({
  visits,
  loading,
  error,
  locale,
  accentColor = "#FF6600",
}: ClientHistoryTabProps) {
  const t = useClientTranslations(locale);

  if (loading) {
    return (
      <div className="mx-4 flex flex-col items-center gap-3 py-12 text-on-surface-variant">
        <div className="h-8 w-8 animate-pulse rounded-full bg-surface-container-high" />
        <p className="text-sm">{t("client.experiencePreparing")}</p>
      </div>
    );
  }

  if (error) {
    return (
      <p className="mx-4 py-8 text-center text-sm text-error">{error || t("client.history.loadError")}</p>
    );
  }

  if (visits.length === 0) {
    return (
      <div className="mx-4 overflow-hidden rounded-3xl" style={deepBrandCard(accentColor)}>
        <div className="flex flex-col items-center gap-3 px-6 py-10 text-center" style={deepGlassOverlay()}>
          <div
            className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10"
            aria-hidden
          >
            <History className="h-6 w-6 text-white/80" />
          </div>
          <p className="font-heading text-lg font-semibold text-white">{t("client.history.emptyTitle")}</p>
          <p className="text-sm text-white/75">{t("client.history.emptyBody")}</p>
        </div>
      </div>
    );
  }

  return (
    <ul className="mx-4 flex flex-col gap-2" aria-label={t("client.tabs.history")}>
      {visits.map((visit) => {
        const { date, time } = formatVisitDate(visit.occurredAt, locale);
        return (
          <li
            key={visit.visitId}
            className="rounded-2xl border border-outline-variant bg-surface-container px-4 py-3"
          >
            <p className="text-sm font-semibold text-on-surface">
              {t(statusKey(visit.status))}
            </p>
            <p className="mt-0.5 text-xs text-on-surface-variant">
              {t("client.history.dateAt", { date, time })}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
