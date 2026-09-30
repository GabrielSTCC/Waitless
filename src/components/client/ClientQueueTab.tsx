"use client";

import { useState } from "react";
import { QueueStatusCard } from "@/components/client/QueueStatusCard";
import { WithdrawQueueButton } from "@/components/client/WithdrawQueueButton";
import { CancelledQueueCard } from "@/components/client/CancelledQueueCard";
import { WithdrawWhatsAppPrompt } from "@/components/client/WithdrawWhatsAppPrompt";
import { useClientTranslations } from "@/components/providers/LocaleProvider";
import { formatHmInZone } from "@/lib/appointments/hours";
import type { Locale, PublicQueueSnapshot } from "@/lib/types";

type WithdrawPhase = "idle" | "confirm" | "whatsapp-prompt" | "done";

interface ClientQueueTabProps {
  snapshot: PublicQueueSnapshot;
  accentColor?: string;
  locale: Locale;
  withdrawPhase: WithdrawPhase;
  onWithdrawClick: () => void;
  onWithdrawSkip: () => void;
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
      <div className="mx-4 rounded-3xl bg-surface-container p-6 text-center">
        <p className="font-heading text-xl font-semibold text-on-surface">
          {t("client.appointmentPassedTitle")}
        </p>
        <p className="mt-2 text-sm text-on-surface-variant">{t("client.appointmentPassedBody")}</p>
      </div>
    );
  }

  if (isAppointment && !inLane) {
    const when = snapshot.scheduledAt ? formatHmInZone(snapshot.scheduledAt) : "";
    return (
      <div className="mx-4 rounded-3xl bg-surface-container p-6 text-center">
        {snapshot.appointmentStatus === "requested" && (
          <p className="text-sm text-on-surface">{t("client.appointmentPendingShop")}</p>
        )}
        {snapshot.appointmentStatus === "rejected" && (
          <p className="text-sm text-on-surface">{t("client.appointmentRejected")}</p>
        )}
        {snapshot.appointmentStatus === "confirmed" && (
          <>
            <p className="font-heading text-xl font-semibold text-on-surface">
              {t("client.appointmentConfirmTitle")}
            </p>
            <p className="mt-2 text-sm text-on-surface-variant">
              {t("client.appointmentConfirmBody", { time: when })}
            </p>
            <button
              type="button"
              disabled={confirming}
              onClick={() => void confirmArrival()}
              className="mt-4 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-on-primary disabled:opacity-60"
            >
              {t("client.appointmentConfirmAction")}
            </button>
            {confirmError && <p className="mt-2 text-sm text-red-700">{confirmError}</p>}
          </>
        )}
      </div>
    );
  }
  const showWhatsAppPrompt = withdrawPhase === "whatsapp-prompt";
  const showCancelled = isCancelled || withdrawPhase === "done";

  if (showCancelled) {
    return (
      <CancelledQueueCard
        clientName={snapshot.clientName ?? ""}
        companyName={snapshot.companyName}
        companyContactWhatsapp={snapshot.companyContactWhatsapp}
        accentColor={accentColor}
        locale={locale}
      />
    );
  }

  if (showWhatsAppPrompt) {
    return (
      <WithdrawWhatsAppPrompt
        clientName={snapshot.clientName ?? ""}
        companyName={snapshot.companyName}
        companyContactWhatsapp={snapshot.companyContactWhatsapp}
        accentColor={accentColor}
        onSkip={onWithdrawSkip}
        locale={locale}
      />
    );
  }

  return (
    <>
      {isAppointment && snapshot.appointmentStatus === "arrival_confirmed" && (
        <div className="mx-4 mb-4 text-sm text-on-surface-variant">
          <p className="font-medium text-on-surface">{t("client.appointmentServing")}</p>
          {snapshot.servingNames && snapshot.servingNames.length > 0 ? (
            <p>{snapshot.servingNames.join(", ")}</p>
          ) : (
            <p>{t("client.appointmentNobodyServing")}</p>
          )}
        </div>
      )}
      <QueueStatusCard
        position={snapshot.position}
        estimatedWaitMin={snapshot.estimatedWaitMin}
        accentColor={accentColor}
        status={snapshot.status}
        toleranceEnabled={snapshot.toleranceEnabled}
        toleranceMin={snapshot.toleranceMin}
        toleranceExpiresAt={snapshot.toleranceExpiresAt}
        locale={locale}
      />
      {showWaiting && (
        <WithdrawQueueButton onClick={onWithdrawClick} locale={locale} />
      )}
    </>
  );
}
