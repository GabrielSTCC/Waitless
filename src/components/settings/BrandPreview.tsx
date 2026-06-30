"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Maximize2, Smartphone, X } from "lucide-react";
import { ClientQueuePreview } from "@/components/preview/ClientQueuePreview";
import { IPhoneMockup } from "@/components/preview/IPhoneMockup";
import { SettingsButton } from "./SettingsButton";
import { SettingsSection } from "./SettingsSection";
import { cn } from "@/lib/utils/cn";
import { estimateWaitMin } from "@/lib/utils/queue-estimate";

interface BrandPreviewProps {
  name: string;
  tagline: string;
  accentColor: string;
  logoUrl: string;
  avgServiceTimeMin: number;
  className?: string;
}

export function BrandPreview({
  name,
  tagline,
  accentColor,
  logoUrl,
  avgServiceTimeMin,
  className,
}: BrandPreviewProps) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!expanded) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setExpanded(false);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [expanded]);

  return (
    <>
      <SettingsSection
        title="Prévia do cliente"
        description="Tela da fila na proporção de um iPhone"
        icon={Smartphone}
        className={className}
        compact
        bodyClassName="!gap-4"
      >
        <div className="flex w-full flex-wrap items-center justify-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full border border-outline-variant/60 bg-surface-container-low px-2.5 py-1">
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt=""
                width={20}
                height={20}
                className="h-5 w-5 rounded-full object-cover"
                unoptimized
              />
            ) : (
              <span className="text-sm" aria-hidden>
                ☕
              </span>
            )}
            <span className="max-w-[100px] truncate text-xs font-medium text-on-surface">
              {name || "Marca"}
            </span>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-outline-variant/60 bg-surface-container-low px-2.5 py-1">
            <span
              className="h-4 w-4 shrink-0 rounded-full border border-outline-variant/40"
              style={{ backgroundColor: accentColor }}
            />
            <span className="font-mono text-[10px] text-on-surface-variant">{accentColor}</span>
          </div>
        </div>

        <IPhoneMockup size="sm" className="mx-auto">
          <ClientQueuePreview
            name={name}
            tagline={tagline}
            accentColor={accentColor}
            logoUrl={logoUrl}
            avgServiceTimeMin={avgServiceTimeMin}
            compact
          />
        </IPhoneMockup>

        <SettingsButton
          type="button"
          variant="secondary"
          size="sm"
          icon={Maximize2}
          fullWidth
          onClick={() => setExpanded(true)}
        >
          Ver prévia em tela cheia
        </SettingsButton>

        <p className="text-center text-[11px] text-on-surface-variant">
          Posição de exemplo: 3 · ETA = {avgServiceTimeMin} min × 2 ={" "}
          {estimateWaitMin(3, avgServiceTimeMin)} min
        </p>
      </SettingsSection>

      {expanded && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Prévia da tela do cliente"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            aria-label="Fechar prévia"
            onClick={() => setExpanded(false)}
          />

          <div className="relative z-10 flex max-h-[92dvh] flex-col items-center gap-4">
            <div className="flex w-full max-w-sm items-center justify-between gap-3 px-1">
              <div>
                <p className="text-sm font-semibold text-white">Tela do cliente</p>
                <p className="text-xs text-white/70">iPhone · fila em tempo real (exemplo)</p>
              </div>
              <button
                type="button"
                onClick={() => setExpanded(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <IPhoneMockup size="lg" floating className={cn("max-h-[75dvh] w-auto")}>
              <ClientQueuePreview
                name={name}
                tagline={tagline}
                accentColor={accentColor}
                logoUrl={logoUrl}
                avgServiceTimeMin={avgServiceTimeMin}
              />
            </IPhoneMockup>
          </div>
        </div>
      )}
    </>
  );
}
