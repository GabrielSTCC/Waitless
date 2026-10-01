"use client";

import { SubmitEvent, useEffect, useMemo, useState } from "react";
import { ClientSearchResults } from "@/components/clients/ClientSearchResults";
import { formatHmInZone } from "@/lib/appointments/hours";
import { auth } from "@/lib/firebase/config";
import { useClients } from "@/lib/hooks/useClients";
import type { Client, Professional, ServiceMode } from "@/lib/types";
import { buildAppointmentStaffLinkMessage } from "@/lib/utils/app-url";
import {
  nameIncludes,
  normalizeWhatsapp,
  whatsappIncludes,
} from "@/lib/utils/format";

interface SendAppointmentLinkFormProps {
  companyId: string;
  companyName: string;
  serviceMode: ServiceMode;
  professionals: Professional[];
  onBooked: (dateISO: string) => void;
  onClose: () => void;
}

type ActiveField = "whatsapp" | "name" | null;

export function SendAppointmentLinkForm({
  companyId,
  companyName,
  serviceMode,
  professionals,
  onBooked,
  onClose,
}: Readonly<SendAppointmentLinkFormProps>) {
  const [whatsapp, setWhatsapp] = useState("");
  const [name, setName] = useState("");
  const [activeField, setActiveField] = useState<ActiveField>(null);
  const [date, setDate] = useState(() =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date()),
  );
  const [professionalId, setProfessionalId] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [scheduledAt, setScheduledAt] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const needsProfessional = serviceMode === "per_professional";

  const { clients, loading: clientsLoading } = useClients(companyId);
  const whatsappDigits = normalizeWhatsapp(whatsapp);

  const results = useMemo(() => {
    if (activeField === "whatsapp" && whatsappDigits.length >= 2) {
      return clients
        .filter((client) =>
          whatsappIncludes(client.normalizedWhatsapp || client.whatsapp, whatsappDigits),
        )
        .slice(0, 8);
    }
    if (activeField === "name" && name.trim().length >= 2) {
      return clients
        .filter((client) => nameIncludes(client.normalizedName || client.name, name))
        .slice(0, 8);
    }
    return [];
  }, [activeField, clients, name, whatsappDigits]);

  const showSuggestions =
    activeField === "whatsapp"
      ? whatsappDigits.length >= 2
      : activeField === "name"
        ? name.trim().length >= 2
        : false;

  useEffect(() => {
    const digits = normalizeWhatsapp(whatsapp);
    if (digits.length < 10) return;
    const match = clients.find((client) => {
      const stored = normalizeWhatsapp(client.normalizedWhatsapp || client.whatsapp);
      return (
        stored === digits ||
        stored === digits.replace(/^55/, "") ||
        `55${stored}` === digits
      );
    });
    if (match) setName(match.name);
  }, [clients, whatsapp]);

  useEffect(() => {
    if (needsProfessional && !professionalId) {
      setSlots([]);
      return;
    }
    let cancelled = false;
    void fetch("/api/appointments/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyId,
        date,
        professionalId: needsProfessional ? professionalId : undefined,
      }),
    })
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as { slots?: string[]; error?: string };
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error ?? "Não foi possível ver os horários.");
          setSlots([]);
          return;
        }
        setError("");
        setSlots(data.slots ?? []);
        setScheduledAt("");
      })
      .catch(() => {
        if (!cancelled) setError("Não foi possível ver os horários.");
      });
    return () => {
      cancelled = true;
    };
  }, [companyId, date, needsProfessional, professionalId]);

  function handleSelectClient(client: Client) {
    setWhatsapp(client.whatsapp || client.normalizedWhatsapp);
    setName(client.name);
    setActiveField(null);
  }

  function handleFieldBlur() {
    window.setTimeout(() => setActiveField(null), 180);
  }

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    const user = auth.currentUser;
    if (!user) return;
    setSending(true);
    setError("");
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "book_staff",
          name,
          whatsapp,
          scheduledAt,
          professionalId: needsProfessional ? professionalId : undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        publicToken?: string;
        error?: string;
      };
      if (!res.ok || !data.publicToken) {
        setError(data.error ?? "Não foi possível agendar.");
        return;
      }
      const when = new Date(scheduledAt);
      const whenLabel = `${formatHmInZone(when)} de ${new Intl.DateTimeFormat("pt-BR", {
        timeZone: "America/Sao_Paulo",
        day: "2-digit",
        month: "2-digit",
      }).format(when)}`;
      const digits = normalizeWhatsapp(whatsapp);
      const message = buildAppointmentStaffLinkMessage(
        name.trim(),
        companyName,
        whenLabel,
        data.publicToken,
        window.location.origin,
      );
      window.open(
        `https://wa.me/55${digits}?text=${encodeURIComponent(message)}`,
        "_blank",
        "noopener,noreferrer",
      );
      onBooked(date);
      onClose();
    } finally {
      setSending(false);
    }
  }

  const suggestDropdownClass =
    "absolute left-0 right-0 top-full z-50 mx-0 mt-1 mb-0 max-w-none shadow-lg";

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      className="relative overflow-visible rounded-2xl border border-outline-variant p-4"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-heading text-lg font-semibold text-on-surface">Enviar link de agendamento</h2>
        <button type="button" onClick={onClose} className="text-sm text-on-surface-variant">
          Fechar
        </button>
      </div>
      <div className="grid gap-3 overflow-visible sm:grid-cols-2">
        <div
          className={`relative text-sm text-on-surface ${
            showSuggestions && activeField === "whatsapp" ? "z-50" : "z-0"
          }`}
        >
          <label className="mb-1 block" htmlFor="send-link-whatsapp">
            WhatsApp
          </label>
          <input
            id="send-link-whatsapp"
            required
            inputMode="tel"
            value={whatsapp}
            onChange={(event) => setWhatsapp(event.target.value)}
            onFocus={() => setActiveField("whatsapp")}
            onBlur={handleFieldBlur}
            autoComplete="off"
            className="mt-1 w-full rounded-xl border border-outline-variant px-3 py-2"
          />
          <ClientSearchResults
            results={results}
            searching={clientsLoading && showSuggestions && activeField === "whatsapp"}
            onSelect={handleSelectClient}
            visible={showSuggestions && activeField === "whatsapp"}
            actionLabel="Usar"
            emptyMessage="Nenhum cliente com este WhatsApp."
            className={suggestDropdownClass}
          />
        </div>
        <div
          className={`relative text-sm text-on-surface ${
            showSuggestions && activeField === "name" ? "z-50" : "z-0"
          }`}
        >
          <label className="mb-1 block" htmlFor="send-link-name">
            Nome
          </label>
          <input
            id="send-link-name"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            onFocus={() => setActiveField("name")}
            onBlur={handleFieldBlur}
            autoComplete="off"
            className="mt-1 w-full rounded-xl border border-outline-variant px-3 py-2"
          />
          <ClientSearchResults
            results={results}
            searching={clientsLoading && showSuggestions && activeField === "name"}
            onSelect={handleSelectClient}
            visible={showSuggestions && activeField === "name"}
            actionLabel="Usar"
            emptyMessage="Nenhum cliente com este nome."
            className={suggestDropdownClass}
          />
        </div>
        {needsProfessional && (
          <label className="text-sm text-on-surface sm:col-span-2">
            <span className="mb-1 block">Profissional</span>
            <select
              required
              value={professionalId}
              onChange={(event) => setProfessionalId(event.target.value)}
              className="mt-1 w-full rounded-xl border border-outline-variant px-3 py-2"
            >
              <option value="">Escolha</option>
              {professionals.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="text-sm text-on-surface">
          <span className="mb-1 block">Dia</span>
          <input
            type="date"
            required
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="mt-1 w-full rounded-xl border border-outline-variant px-3 py-2"
          />
        </label>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {slots.length === 0 && (
          <p className="text-sm text-on-surface-variant">Nenhum horário livre neste dia.</p>
        )}
        {slots.map((slot) => (
          <button
            key={slot}
            type="button"
            onClick={() => setScheduledAt(slot)}
            className={`rounded-full px-3 py-1.5 text-sm ${
              scheduledAt === slot ? "bg-primary text-on-primary" : "bg-surface-container text-on-surface"
            }`}
          >
            {formatHmInZone(new Date(slot))}
          </button>
        ))}
      </div>
      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
      <button
        type="submit"
        disabled={sending || !scheduledAt}
        className="mt-4 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-on-primary disabled:opacity-50"
      >
        {sending ? "Enviando..." : "Enviar link"}
      </button>
    </form>
  );
}
