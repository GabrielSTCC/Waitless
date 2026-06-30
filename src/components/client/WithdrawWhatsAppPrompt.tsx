"use client";

import { MessageCircle } from "lucide-react";
import { useClientTranslations } from "@/components/providers/LocaleProvider";
import type { Locale } from "@/lib/types";
import { buildWhatsAppWaMeUrl, buildWithdrawWhatsAppMessage } from "@/lib/utils/app-url";
import { deepBrandCard, deepGlassOverlay } from "@/lib/utils/brand-surface";

interface WithdrawWhatsAppPromptProps {
  clientName: string;
  companyName: string;
  companyContactWhatsapp?: string;
  accentColor?: string;
  onSkip: () => void;
  locale?: Locale;
}

export function WithdrawWhatsAppPrompt({
  clientName,
  companyName,
  companyContactWhatsapp,
  accentColor,
  onSkip,
  locale = "pt-BR",
}: WithdrawWhatsAppPromptProps) {
  const t = useClientTranslations(locale);
  const accent = accentColor ?? "var(--color-primary)";
  const canWhatsApp = !!companyContactWhatsapp?.replace(/\D/g, "");

  function handleWhatsApp() {
    if (!canWhatsApp || !companyContactWhatsapp) return;
    const msg = buildWithdrawWhatsAppMessage(clientName, companyName);
    const url = buildWhatsAppWaMeUrl(companyContactWhatsapp, msg);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
    onSkip();
  }

  return (
    <div className="mx-4 mt-4 overflow-hidden rounded-3xl" style={deepBrandCard(accent)}>
      <div className="rounded-3xl p-6" style={deepGlassOverlay()}>
        <p className="text-center font-heading text-lg font-bold text-white">
          {t("client.withdraw.whatsappTitle")}
        </p>
        <p className="mt-2 text-center text-sm text-white/85">
          {canWhatsApp
            ? t("client.withdraw.whatsappBody", { company: companyName })
            : t("client.withdraw.whatsappUnavailable")}
        </p>
        <div className="mt-5 flex flex-col gap-2">
          {canWhatsApp && (
            <button
              type="button"
              onClick={handleWhatsApp}
              className="flex items-center justify-center gap-2 rounded-xl bg-white/20 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/30"
            >
              <MessageCircle className="h-4 w-4" />
              {t("client.withdraw.whatsappYes")}
            </button>
          )}
          <button
            type="button"
            onClick={onSkip}
            className="rounded-xl border border-white/20 px-4 py-3 text-sm font-medium text-white/90 hover:bg-white/10"
          >
            {t("client.withdraw.whatsappNo")}
          </button>
        </div>
      </div>
    </div>
  );
}
