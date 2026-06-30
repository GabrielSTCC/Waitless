"use client";

import type { CSSProperties } from "react";
import { ClientHeader } from "@/components/client/ClientHeader";
import { ClientLivePill } from "@/components/client/ClientLivePill";
import { QueueStatusCard } from "@/components/client/QueueStatusCard";
import { brandMeshBackground } from "@/lib/utils/brand-surface";
import { estimateWaitMin } from "@/lib/utils/queue-estimate";
import type { Locale } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

export interface ClientQueuePreviewProps {
  name: string;
  tagline: string;
  accentColor: string;
  logoUrl: string;
  avgServiceTimeMin: number;
  /** Posição de exemplo na fila */
  samplePosition?: number;
  compact?: boolean;
  locale?: Locale;
  dark?: boolean;
}

export function ClientQueuePreview({
  name,
  tagline,
  accentColor,
  logoUrl,
  avgServiceTimeMin,
  samplePosition = 3,
  compact = false,
  locale = "pt-BR",
  dark = false,
}: ClientQueuePreviewProps) {
  const brandStyle = {
    "--color-primary": accentColor,
    "--color-surface-tint": accentColor,
    ...brandMeshBackground(accentColor, dark),
  } as CSSProperties;

  const estimatedWaitMin = estimateWaitMin(samplePosition, avgServiceTimeMin);

  return (
    <div
      className={cn("flex min-h-full flex-col", compact ? "pb-4" : "pb-6")}
      style={brandStyle}
    >
      <ClientHeader
        companyName={name || "Seu estabelecimento"}
        tagline={tagline || undefined}
        logoUrl={logoUrl || undefined}
        accentColor={accentColor}
        compact={compact}
        dark={dark}
        locale={locale}
      />

      <ClientLivePill
        connected
        accentColor={accentColor}
        locale={locale}
        className={cn(compact ? "mb-2" : "mb-3")}
      />

      <main className={cn("flex flex-1 flex-col", compact ? "pt-0" : "pt-1")}>
        <QueueStatusCard
          position={samplePosition}
          estimatedWaitMin={estimatedWaitMin}
          accentColor={accentColor}
          status="waiting"
          locale={locale}
        />
      </main>
    </div>
  );
}
