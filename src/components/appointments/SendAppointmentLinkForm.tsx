"use client";

import { SubmitEvent, useEffect, useState } from "react";
import { formatHmInZone } from "@/lib/appointments/hours";
import { auth } from "@/lib/firebase/config";
import { searchClients } from "@/lib/firebase/firestore";
import { buildAppointmentStaffLinkMessage } from "@/lib/utils/app-url";
import { normalizeWhatsapp } from "@/lib/utils/format";
import type { Professional, ServiceMode } from "@/lib/types";

interface SendAppointmentLinkFormProps {
  companyId: string;
  companyName: string;
  serviceMode: ServiceMode;
  professionals: Professional[];
  onBooked: (dateISO: string) => void;
  onClose: () => void;
}

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

  useEffect(() => {
    const digits = normalizeWhatsapp(whatsapp);
    if (digits.length < 10) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void searchClients(companyId, digits)
        .then((results) => {
          if (cancelled) return;
          const match = results.find((client) => client.normalizedWhatsapp === digits);
          setName(match?.name ?? "");
        })
        .catch(() => {
          if (!cancelled) setName("");
        });
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [companyId, whatsapp]);

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

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      className="rounded-2xl border border-outline-variant p-4"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-heading text-lg font-semibold text-on-surface">Enviar link de agendamento</h2>
        <button type="button" onClick={onClose} className="text-sm text-on-surface-variant">
          Fechar
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm text-on-surface">
          <span className="mb-1 block">WhatsApp</span>
          <input
            required
            inputMode="tel"
            value={whatsapp}
            onChange={(event) => setWhatsapp(event.target.value)}
            className="mt-1 w-full rounded-xl border border-outline-variant px-3 py-2"
          />
        </label>
        <label className="text-sm text-on-surface">
          <span className="mb-1 block">Nome</span>
          <input
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-1 w-full rounded-xl border border-outline-variant px-3 py-2"
          />
        </label>
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
