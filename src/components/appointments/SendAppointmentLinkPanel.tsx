"use client";

import { useMemo, useState } from "react";
import { SendAppointmentLinkForm } from "@/components/appointments/SendAppointmentLinkForm";
import type { Professional, ServiceMode } from "@/lib/types";
import {
  buildAppointmentBookingUrl,
  buildAppointmentPublicBookingMessage,
} from "@/lib/utils/app-url";

type TabId = "public" | "staff";

interface SendAppointmentLinkPanelProps {
  companyId: string;
  companyName: string;
  serviceMode: ServiceMode;
  professionals: Professional[];
  onBooked: (dateISO: string) => void;
  onClose: () => void;
}

export function SendAppointmentLinkPanel({
  companyId,
  companyName,
  serviceMode,
  professionals,
  onBooked,
  onClose,
}: Readonly<SendAppointmentLinkPanelProps>) {
  const [tab, setTab] = useState<TabId>("public");
  const [copied, setCopied] = useState(false);

  const bookingUrl = useMemo(() => {
    if (typeof window === "undefined") {
      return buildAppointmentBookingUrl(companyId);
    }
    return buildAppointmentBookingUrl(companyId, window.location.origin);
  }, [companyId]);

  async function handleCopy() {
    if (!bookingUrl) return;
    try {
      await navigator.clipboard.writeText(bookingUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  function handleWhatsAppShare() {
    const message = buildAppointmentPublicBookingMessage(
      companyName,
      companyId,
      typeof window !== "undefined" ? window.location.origin : undefined,
    );
    window.open(
      `https://wa.me/?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  return (
    <div className="relative overflow-visible rounded-2xl border border-outline-variant p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-heading text-lg font-semibold text-on-surface">
          Enviar link de agendamento
        </h2>
        <button type="button" onClick={onClose} className="text-sm text-on-surface-variant">
          Fechar
        </button>
      </div>

      <div className="mb-4 flex gap-1 rounded-xl bg-surface-container p-1">
        <button
          type="button"
          onClick={() => setTab("public")}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            tab === "public"
              ? "bg-surface text-on-surface shadow-sm"
              : "text-on-surface-variant hover:text-on-surface"
          }`}
        >
          Link público
        </button>
        <button
          type="button"
          onClick={() => setTab("staff")}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            tab === "staff"
              ? "bg-surface text-on-surface shadow-sm"
              : "text-on-surface-variant hover:text-on-surface"
          }`}
        >
          Marcar pela equipe
        </button>
      </div>

      {tab === "public" ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-on-surface-variant">
            Qualquer cliente abre o link, informa o WhatsApp e marca o horário. Se já for
            cadastrado, só o número basta; se for novo, preenche o nome (e pode criar uma senha
            opcional).
          </p>
          <div className="rounded-xl border border-outline-variant bg-surface-container-low px-3 py-2.5">
            <p className="break-all font-mono text-xs text-on-surface sm:text-sm">{bookingUrl}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleCopy()}
              disabled={!bookingUrl}
              className="rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-on-primary disabled:opacity-50"
            >
              {copied ? "Copiado!" : "Copiar link"}
            </button>
            <button
              type="button"
              onClick={handleWhatsAppShare}
              disabled={!bookingUrl}
              className="rounded-xl border border-outline-variant px-4 py-2.5 text-sm font-medium text-on-surface disabled:opacity-50"
            >
              Abrir WhatsApp
            </button>
          </div>
        </div>
      ) : (
        <SendAppointmentLinkForm
          companyId={companyId}
          companyName={companyName}
          serviceMode={serviceMode}
          professionals={professionals}
          onBooked={onBooked}
          onClose={onClose}
          embedded
        />
      )}
    </div>
  );
}
