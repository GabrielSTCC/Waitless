"use client";

import { SubmitEvent, useEffect, useRef, useState } from "react";
import { formatHmInZone } from "@/lib/appointments/hours";
import type { Professional, ServiceMode } from "@/lib/types";

interface BookPageProps {
  companyId: string;
}

export function BookAppointmentForm({ companyId }: Readonly<BookPageProps>) {
  const [date, setDate] = useState(() =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date()),
  );
  const [mode, setMode] = useState<ServiceMode>("single");
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [professionalId, setProfessionalId] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [companyName, setCompanyName] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [error, setError] = useState("");
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(true);
  const requestId = useRef(0);

  useEffect(() => {
    const id = requestId.current + 1;
    requestId.current = id;
    setSlotsLoading(true);
    void (async () => {
      const res = await fetch("/api/appointments/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          date,
          professionalId: professionalId || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        companyName?: string;
        serviceMode?: ServiceMode;
        professionals?: Professional[];
        slots?: string[];
        error?: string;
      };
      if (requestId.current !== id) return;
      setSlotsLoading(false);
      if (!res.ok) {
        setError(data.error ?? "Não foi possível carregar os horários.");
        setSlots([]);
        return;
      }
      setError("");
      setCompanyName(data.companyName ?? "");
      setMode(data.serviceMode ?? "single");
      setProfessionals(data.professionals ?? []);
      setSlots(data.slots ?? []);
    })();
  }, [companyId, date, professionalId]);

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/appointments/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          name,
          whatsapp,
          scheduledAt,
          professionalId: mode === "per_professional" ? professionalId : undefined,
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
      setToken(data.publicToken);
    } finally {
      setLoading(false);
    }
  }

  if (token) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-3 px-6">
        <h1 className="font-heading text-2xl font-semibold text-on-surface">Pedido enviado</h1>
        <p className="text-sm text-on-surface-variant">
          {companyName} vai confirmar o horário. Acompanhe por este link.
        </p>
        <a className="text-sm font-medium text-primary" href={`/q/${token}`}>
          Abrir meu horário
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="mx-auto flex min-h-dvh max-w-lg flex-col gap-4 px-6 py-10">
      <h1 className="font-heading text-2xl font-semibold text-on-surface">
        {companyName ? `Agendar em ${companyName}` : "Agendar"}
      </h1>
      <label className="text-sm text-on-surface">
        <span className="mb-1 block">Data</span>
        <input
          type="date"
          required
          value={date}
          onChange={(event) => setDate(event.target.value)}
          className="mt-1 w-full rounded-xl border border-outline-variant px-3 py-2"
        />
      </label>
      {mode === "per_professional" && (
        <label className="text-sm text-on-surface">
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
      <fieldset>
        <legend className="text-sm text-on-surface">Horário</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {slotsLoading && (
            <p className="text-sm text-on-surface-variant">Carregando horários...</p>
          )}
          {!slotsLoading && slots.length === 0 && (
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
      </fieldset>
      <label className="text-sm text-on-surface">
        <span className="mb-1 block">Nome</span>
        <input
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="mt-1 w-full rounded-xl border border-outline-variant px-3 py-2"
        />
      </label>
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
      {error && <p className="text-sm text-red-700">{error}</p>}
      <button
        type="submit"
        disabled={loading || !scheduledAt}
        className="rounded-xl bg-primary px-4 py-3 text-sm font-medium text-on-primary disabled:opacity-50"
      >
        {loading ? "Enviando..." : "Pedir horário"}
      </button>
    </form>
  );
}
