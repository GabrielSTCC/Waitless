"use client";

import { useState, type ReactNode } from "react";
import { CalendarClock, UserRound } from "lucide-react";
import { QueueStatusCard } from "@/components/client/QueueStatusCard";
import { WithdrawQueueButton } from "@/components/client/WithdrawQueueButton";
import { CancelledQueueCard } from "@/components/client/CancelledQueueCard";
import { WithdrawWhatsAppPrompt } from "@/components/client/WithdrawWhatsAppPrompt";
import { useClientTranslations } from "@/components/providers/LocaleProvider";
import { APPOINTMENT_TIME_ZONE, formatHmInZone } from "@/lib/appointments/hours";
import type { Locale, PublicQueueSnapshot } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

type WithdrawPhase = "idle" | "confirm" | "whatsapp-prompt" | "done";

interface ClientQueueTabProps {
  snapshot: PublicQueueSnapshot;
  accentColor?: string;
  locale: Locale;
  withdrawPhase: WithdrawPhase;
  onWithdrawClick: () => void;
  onWithdrawSkip: () => void;
}

function formatScheduledLabel(date: Date, locale: Locale): string {
  const day = new Intl.DateTimeFormat(locale === "en" ? "en-US" : "pt-BR", {
    timeZone: APPOINTMENT_TIME_ZONE,
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(date);
  return `${day} · ${formatHmInZone(date)}`;
}

function ContextPanel({
  children,
  className,
}: Readonly<{ children: ReactNode; className?: string }>) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-outline-variant/70 bg-surface-container/80 px-5 py-5 md:px-6 md:py-6 lg:px-8 lg:py-8",
        className,
      )}
    >
      {children}
    </div>
  );
}

function MetaRow({
  icon,
  label,
  value,
}: Readonly<{ icon: ReactNode; label: string; value: string }>) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-on-surface-variant" aria-hidden>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-on-surface-variant">
          {label}
        </p>
        <p className="mt-0.5 text-sm font-semibold text-on-surface">{value}</p>
      </div>
    </div>
  );
}

export function ClientQueueTab({
  snapshot,
  accentColor,
  locale,
  withdrawPhase,
  onWithdrawClick,
  onWithdrawSkip,
}: Readonly<ClientQueueTabProps>) {
  const t = useClientTranslations(locale);
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState("");
  const isAppointment = snapshot.queueKind === "appointment";
  const inLane =
    snapshot.appointmentStatus === "arrival_confirmed" ||
    snapshot.appointmentStatus === "in_service" ||
    snapshot.appointmentStatus === "completed";
  const passed = snapshot.passed || snapshot.appointmentStatus === "skipped";
  const isCancelled = snapshot.status === "cancelled" && !passed;
  const showWaiting =
    snapshot.status === "waiting" &&
    withdrawPhase !== "whatsapp-prompt" &&
    !isCancelled &&
    (!isAppointment || inLane);

  const whenLabel = snapshot.scheduledAt
    ? formatScheduledLabel(snapshot.scheduledAt, locale)
    : "";

  async function confirmArrival() {
    setConfirming(true);
    setConfirmError("");
    try {
      const res = await fetch("/api/appointments/arrive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: snapshot.token }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) setConfirmError(data.error ?? t("client.appointmentConfirmAction"));
    } finally {
      setConfirming(false);
    }
  }

  if (passed) {
    return (
      <div className="mx-4 md:mx-6 lg:mx-8">
        <ContextPanel className="text-center">
          <p className="font-heading text-xl font-semibold text-on-surface">
            {t("client.appointmentPassedTitle")}
          </p>
          <p className="mt-2 text-sm text-on-surface-variant">
            {t("client.appointmentPassedBody")}
          </p>
        </ContextPanel>
      </div>
    );
  }

  if (isAppointment && !inLane) {
    return (
      <div className="mx-4 grid gap-4 md:mx-6 md:grid-cols-2 md:items-stretch md:gap-6 lg:mx-8 lg:gap-8 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <ContextPanel className="text-center md:text-left md:min-h-[20rem]">
          {snapshot.appointmentStatus === "requested" && (
            <>
              <p className="font-heading text-xl font-semibold text-on-surface">
                {t("client.appointmentPendingShop")}
              </p>
              {whenLabel ? (
                <p className="mt-2 text-sm text-on-surface-variant">{whenLabel}</p>
              ) : null}
            </>
          )}
          {snapshot.appointmentStatus === "rejected" && (
            <p className="font-heading text-xl font-semibold text-on-surface">
              {t("client.appointmentRejected")}
            </p>
          )}
          {snapshot.appointmentStatus === "confirmed" && (
            <>
              <p className="font-heading text-xl font-semibold text-on-surface md:text-2xl">
                {t("client.appointmentConfirmTitle")}
              </p>
              <p className="mt-2 text-sm text-on-surface-variant">
                {t("client.appointmentConfirmBody", { time: whenLabel })}
              </p>
              <button
                type="button"
                disabled={confirming}
                onClick={() => void confirmArrival()}
                className="mt-5 inline-flex rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-on-primary disabled:opacity-60"
              >
                {t("client.appointmentConfirmAction")}
              </button>
              {confirmError && <p className="mt-2 text-sm text-red-700">{confirmError}</p>}
            </>
          )}
        </ContextPanel>

        <ContextPanel className="space-y-4">
          {whenLabel ? (
            <MetaRow
              icon={<CalendarClock className="h-4 w-4" strokeWidth={2} />}
              label={t("client.appointmentWhenLabel")}
              value={whenLabel}
            />
          ) : null}
          {snapshot.professionalName ? (
            <MetaRow
              icon={<UserRound className="h-4 w-4" strokeWidth={2} />}
              label={t("client.appointmentProfessionalLabel")}
              value={snapshot.professionalName}
            />
          ) : null}
          {snapshot.clientName ? (
            <MetaRow
              icon={<UserRound className="h-4 w-4" strokeWidth={2} />}
              label={t("client.profile.nameLabel")}
              value={snapshot.clientName}
            />
          ) : null}
        </ContextPanel>
      </div>
    );
  }

  const showWhatsAppPrompt = withdrawPhase === "whatsapp-prompt";
  const showCancelled = isCancelled || withdrawPhase === "done";

  if (showCancelled) {
    return (
      <div className="mx-4 md:mx-6 lg:mx-8">
        <CancelledQueueCard
          clientName={snapshot.clientName ?? ""}
          companyName={snapshot.companyName}
          companyContactWhatsapp={snapshot.companyContactWhatsapp}
          accentColor={accentColor}
          locale={locale}
        />
      </div>
    );
  }

  if (showWhatsAppPrompt) {
    return (
      <div className="mx-4 md:mx-6 lg:mx-8">
        <WithdrawWhatsAppPrompt
          clientName={snapshot.clientName ?? ""}
          companyName={snapshot.companyName}
          companyContactWhatsapp={snapshot.companyContactWhatsapp}
          accentColor={accentColor}
          onSkip={onWithdrawSkip}
          locale={locale}
        />
      </div>
    );
  }

  const contextPanel = (
    <ContextPanel className="flex h-full flex-col gap-5">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wide text-on-surface-variant">
          {t("client.contextTitle")}
        </p>
        <p className="mt-1 font-heading text-lg font-semibold text-on-surface">
          {isAppointment ? t("client.contextAppointment") : t("client.contextWalkIn")}
        </p>
      </div>

      <div className="space-y-4">
        {isAppointment && whenLabel ? (
          <MetaRow
            icon={<CalendarClock className="h-4 w-4" strokeWidth={2} />}
            label={t("client.appointmentWhenLabel")}
            value={whenLabel}
          />
        ) : null}
        {snapshot.professionalName ? (
          <MetaRow
            icon={<UserRound className="h-4 w-4" strokeWidth={2} />}
            label={t("client.appointmentProfessionalLabel")}
            value={snapshot.professionalName}
          />
        ) : null}
        {isAppointment && (
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-on-surface-variant">
              {t("client.appointmentServing")}
            </p>
            <p className="mt-1 text-sm text-on-surface">
              {snapshot.servingNames && snapshot.servingNames.length > 0
                ? snapshot.servingNames.join(", ")
                : t("client.appointmentNobodyServing")}
            </p>
          </div>
        )}
      </div>

      {showWaiting ? (
        <div className="mt-auto pt-2">
          <WithdrawQueueButton onClick={onWithdrawClick} locale={locale} flush />
        </div>
      ) : null}
    </ContextPanel>
  );

  return (
    <div className="mx-4 grid gap-4 md:mx-6 md:grid-cols-2 md:items-stretch md:gap-6 lg:mx-8 lg:gap-8 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <QueueStatusCard
        position={snapshot.position}
        estimatedWaitMin={snapshot.estimatedWaitMin}
        accentColor={accentColor}
        status={snapshot.status}
        toleranceEnabled={snapshot.toleranceEnabled}
        toleranceMin={snapshot.toleranceMin}
        toleranceExpiresAt={snapshot.toleranceExpiresAt}
        locale={locale}
        className="h-full"
      />
      {contextPanel}
    </div>
  );
}
