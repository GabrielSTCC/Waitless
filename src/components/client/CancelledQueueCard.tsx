"use client";

import { MessageCircle, UserX } from "lucide-react";
import { useClientTranslations } from "@/components/providers/LocaleProvider";
import type { Locale } from "@/lib/types";
import { buildWhatsAppWaMeUrl, buildWithdrawWhatsAppMessage } from "@/lib/utils/app-url";
import { deepBrandCard, deepGlassOverlay, glassChip } from "@/lib/utils/brand-surface";

interface CancelledQueueCardProps {
  clientName: string;
  companyName: string;
  companyContactWhatsapp?: string;
  accentColor?: string;
  locale?: Locale;
}

export function CancelledQueueCard({
  clientName,
  companyName,
  companyContactWhatsapp,
  accentColor,
  locale = "pt-BR",
}: CancelledQueueCardProps) {
  const t = useClientTranslations(locale);
  const accent = accentColor ?? "var(--color-primary)";
  const canWhatsApp = !!companyContactWhatsapp?.replace(/\D/g, "");

  function handleWhatsApp() {
    if (!canWhatsApp || !companyContactWhatsapp) return;
    const msg = buildWithdrawWhatsAppMessage(clientName, companyName);
    const url = buildWhatsAppWaMeUrl(companyContactWhatsapp, msg);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="mx-4 overflow-hidden rounded-3xl" style={deepBrandCard(accent)}>
      <div className="rounded-3xl p-6" style={deepGlassOverlay()}>
        <div className="flex flex-col items-center text-center">
          <div
            className="mb-3 flex h-12 w-12 items-center justify-center rounded-full"
            style={glassChip()}
          >
            <UserX className="h-5 w-5 text-white" strokeWidth={2} />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/90">
            {t("client.cancelled.label")}
          </p>
          <p className="mt-2 font-heading text-2xl font-bold text-white drop-shadow-sm">
            {t("client.cancelled.title")}
          </p>
          <p className="mt-2 text-sm font-medium text-white">{t("client.cancelled.body")}</p>
          {canWhatsApp && (
            <button
              type="button"
              onClick={handleWhatsApp}
              className="mt-6 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              style={glassChip(accent)}
            >
              <MessageCircle className="h-4 w-4" />
              {t("client.cancelled.whatsappAction")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
