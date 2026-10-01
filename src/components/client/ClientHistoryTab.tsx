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
}: Readonly<ClientHistoryTabProps>) {
  const t = useClientTranslations(locale);

  if (loading) {
    return (
      <div className="mx-4 flex flex-col items-center gap-3 py-12 text-on-surface-variant md:mx-6 lg:mx-8">
        <div className="h-8 w-8 animate-pulse rounded-full bg-surface-container-high" />
        <p className="text-sm">{t("client.experiencePreparing")}</p>
      </div>
    );
  }

  if (error) {
    return (
      <p className="mx-4 py-8 text-center text-sm text-error md:mx-6 lg:mx-8">{error}</p>
    );
  }

  if (visits.length === 0) {
    return (
      <div
        className="mx-4 overflow-hidden rounded-3xl md:mx-6 lg:mx-8"
        style={deepBrandCard(accentColor)}
      >
        <div
          className="flex flex-col items-center gap-3 px-6 py-10 text-center md:px-10 md:py-14 lg:py-16"
          style={deepGlassOverlay()}
        >
          <div
            className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10"
            aria-hidden
          >
            <History className="h-6 w-6 text-white/80" />
          </div>
          <p className="font-heading text-lg font-semibold text-white md:text-xl">
            {t("client.history.emptyTitle")}
          </p>
          <p className="max-w-md text-sm text-white/75 md:text-base">{t("client.history.emptyBody")}</p>
        </div>
      </div>
    );
  }

  return (
    <ul
      className="mx-4 grid gap-2 md:mx-6 md:gap-3 lg:mx-8 lg:grid-cols-2 xl:gap-x-10"
      aria-label={t("client.tabs.history")}
    >
      {visits.map((visit) => {
        const { date, time } = formatVisitDate(visit.occurredAt, locale);
        return (
          <li
            key={visit.visitId}
            className="flex items-baseline justify-between gap-4 border-b border-outline-variant/60 py-3 last:border-b-0 md:py-3.5 lg:border-b lg:last:border-b"
          >
            <p className="text-sm font-semibold text-on-surface md:text-base">
              {t(statusKey(visit.status))}
            </p>
            <p className="shrink-0 text-xs text-on-surface-variant md:text-sm">
              {t("client.history.dateAt", { date, time })}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
