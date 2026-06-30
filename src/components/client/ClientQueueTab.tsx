"use client";

import { QueueStatusCard } from "@/components/client/QueueStatusCard";
import { WithdrawQueueButton } from "@/components/client/WithdrawQueueButton";
import { CancelledQueueCard } from "@/components/client/CancelledQueueCard";
import { WithdrawWhatsAppPrompt } from "@/components/client/WithdrawWhatsAppPrompt";
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
}: ClientQueueTabProps) {
  const isCancelled = snapshot.status === "cancelled";
  const showWaiting =
    snapshot.status === "waiting" && withdrawPhase !== "whatsapp-prompt" && !isCancelled;
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
