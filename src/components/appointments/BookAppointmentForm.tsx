"use client";

import { SubmitEvent, useEffect, useRef, useState } from "react";
import { formatHmInZone } from "@/lib/appointments/hours";
import { CLIENT_PASSWORD_MIN_LENGTH } from "@/lib/appointments/client-password-policy";
import type { Professional, ServiceMode } from "@/lib/types";
import { normalizeWhatsapp } from "@/lib/utils/format";

interface BookPageProps {
  companyId: string;
}

type LookupState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "new" }
  | { status: "known"; name: string }
  | { status: "locked" }
  | { status: "verified"; name: string };

export function BookAppointmentForm({ companyId }: Readonly<BookPageProps>) {
  const [step, setStep] = useState<"identity" | "slot">("identity");
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
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [wantPassword, setWantPassword] = useState(false);
  const [lookup, setLookup] = useState<LookupState>({ status: "idle" });
  const [error, setError] = useState("");
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const requestId = useRef(0);
  const identityReady =
    lookup.status === "new" ||
    lookup.status === "known" ||
    lookup.status === "verified";

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const today = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Sao_Paulo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());
      const res = await fetch("/api/appointments/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, date: today }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        companyName?: string;
        serviceMode?: ServiceMode;
        professionals?: Professional[];
      };
      if (cancelled || !res.ok) return;
      setCompanyName(data.companyName ?? "");
      setMode(data.serviceMode ?? "single");
      setProfessionals(data.professionals ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  useEffect(() => {
    if (step !== "slot") return;
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
  }, [companyId, date, professionalId, step]);

  async function handleLookup(event: SubmitEvent) {
    event.preventDefault();
    setError("");
    setLookup({ status: "loading" });
    try {
      const res = await fetch("/api/appointments/client-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, whatsapp }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        exists?: boolean;
        hasPassword?: boolean;
        name?: string;
        error?: string;
        companyName?: string;
      };
      if (!res.ok) {
        setLookup({ status: "idle" });
        setError(data.error ?? "Não foi possível consultar o WhatsApp.");
        return;
      }
      if (!data.exists) {
        setLookup({ status: "new" });
        setName("");
        setPassword("");
        setNewPassword("");
        setWantPassword(false);
        return;
      }
      if (data.hasPassword) {
        setLookup({ status: "locked" });
        setName("");
        setPassword("");
        return;
      }
      setLookup({ status: "known", name: data.name ?? "" });
      setName(data.name ?? "");
      setPassword("");
    } catch {
      setLookup({ status: "idle" });
      setError("Não foi possível consultar o WhatsApp.");
    }
  }

  function handleContinueToSlots() {
    setError("");
    if (lookup.status === "new") {
      if (name.trim().length < 2) {
        setError("Informe o nome.");
        return;
      }
      if (wantPassword && newPassword.length < CLIENT_PASSWORD_MIN_LENGTH) {
        setError(`A senha deve ter pelo menos ${CLIENT_PASSWORD_MIN_LENGTH} caracteres.`);
        return;
      }
    }
    if (lookup.status === "locked") {
      if (!password) {
        setError("Informe a senha.");
        return;
      }
      setLookup({ status: "verified", name: name.trim() });
    }
    if (lookup.status === "known" && name.trim().length < 2) {
      setError("Informe o nome.");
      return;
    }
    setStep("slot");
  }

  function handleChangeWhatsapp(value: string) {
    setWhatsapp(value);
    setLookup({ status: "idle" });
    setPassword("");
    setNewPassword("");
    setWantPassword(false);
    setError("");
    if (step === "slot") setStep("identity");
  }

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
          password:
            lookup.status === "verified" || lookup.status === "locked"
              ? password
              : undefined,
          newPassword:
            lookup.status === "new" && wantPassword && newPassword
              ? newPassword
              : undefined,
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

  if (step === "identity") {
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col gap-4 px-6 py-10">
        <h1 className="font-heading text-2xl font-semibold text-on-surface">
          {companyName ? `Agendar em ${companyName}` : "Agendar"}
        </h1>
        <p className="text-sm text-on-surface-variant">
          Informe seu WhatsApp. Se você já for cliente, seguimos com o número; se for novo,
          pedimos o nome (e você pode criar uma senha opcional).
        </p>

        <form onSubmit={(event) => void handleLookup(event)} className="flex flex-col gap-3">
          <label className="text-sm text-on-surface">
            <span className="mb-1 block">WhatsApp</span>
            <input
              required
              inputMode="tel"
              value={whatsapp}
              onChange={(event) => handleChangeWhatsapp(event.target.value)}
              className="mt-1 w-full rounded-xl border border-outline-variant px-3 py-2"
            />
          </label>
          {lookup.status === "idle" || lookup.status === "loading" ? (
            <button
              type="submit"
              disabled={lookup.status === "loading" || normalizeWhatsapp(whatsapp).length < 10}
              className="rounded-xl bg-primary px-4 py-3 text-sm font-medium text-on-primary disabled:opacity-50"
            >
              {lookup.status === "loading" ? "Consultando..." : "Continuar"}
            </button>
          ) : null}
        </form>

        {lookup.status === "new" ? (
          <div className="flex flex-col gap-3 rounded-2xl border border-outline-variant p-4">
            <p className="text-sm font-medium text-on-surface">Novo cliente</p>
            <label className="text-sm text-on-surface">
              <span className="mb-1 block">Nome</span>
              <input
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-1 w-full rounded-xl border border-outline-variant px-3 py-2"
              />
            </label>
            <label className="flex items-start gap-2 text-sm text-on-surface">
              <input
                type="checkbox"
                checked={wantPassword}
                onChange={(event) => setWantPassword(event.target.checked)}
                className="mt-1"
              />
              <span>Criar uma senha opcional para proteger meu cadastro nas próximas vezes</span>
            </label>
            {wantPassword ? (
              <label className="text-sm text-on-surface">
                <span className="mb-1 block">Senha (mín. {CLIENT_PASSWORD_MIN_LENGTH})</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-outline-variant px-3 py-2"
                />
              </label>
            ) : null}
            <button
              type="button"
              onClick={handleContinueToSlots}
              className="rounded-xl bg-primary px-4 py-3 text-sm font-medium text-on-primary"
            >
              Escolher horário
            </button>
          </div>
        ) : null}

        {lookup.status === "known" ? (
          <div className="flex flex-col gap-3 rounded-2xl border border-outline-variant p-4">
            <p className="text-sm text-on-surface-variant">
              Encontramos seu cadastro. Confirme o nome e escolha o horário.
            </p>
            <label className="text-sm text-on-surface">
              <span className="mb-1 block">Nome</span>
              <input
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-1 w-full rounded-xl border border-outline-variant px-3 py-2"
              />
            </label>
            <button
              type="button"
              onClick={handleContinueToSlots}
              className="rounded-xl bg-primary px-4 py-3 text-sm font-medium text-on-primary"
            >
              Escolher horário
            </button>
          </div>
        ) : null}

        {lookup.status === "locked" ? (
          <div className="flex flex-col gap-3 rounded-2xl border border-outline-variant p-4">
            <p className="text-sm text-on-surface-variant">
              Este WhatsApp tem senha. Digite-a para continuar.
            </p>
            <label className="text-sm text-on-surface">
              <span className="mb-1 block">Senha</span>
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-1 w-full rounded-xl border border-outline-variant px-3 py-2"
              />
            </label>
            <button
              type="button"
              onClick={handleContinueToSlots}
              className="rounded-xl bg-primary px-4 py-3 text-sm font-medium text-on-primary"
            >
              Escolher horário
            </button>
          </div>
        ) : null}

        {error ? <p className="text-sm text-red-700">{error}</p> : null}
      </div>
    );
  }

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      className="mx-auto flex min-h-dvh max-w-lg flex-col gap-4 px-6 py-10"
    >
      <div className="flex items-start justify-between gap-3">
        <h1 className="font-heading text-2xl font-semibold text-on-surface">
          {companyName ? `Agendar em ${companyName}` : "Agendar"}
        </h1>
        <button
          type="button"
          onClick={() => setStep("identity")}
          className="text-sm text-on-surface-variant"
        >
          Voltar
        </button>
      </div>
      <p className="text-sm text-on-surface-variant">
        WhatsApp {whatsapp}
        {name.trim() ? ` · ${name.trim()}` : ""}
      </p>

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
      {error && <p className="text-sm text-red-700">{error}</p>}
      <button
        type="submit"
        disabled={loading || !scheduledAt || !identityReady}
        className="rounded-xl bg-primary px-4 py-3 text-sm font-medium text-on-primary disabled:opacity-50"
      >
        {loading ? "Enviando..." : "Pedir horário"}
      </button>
    </form>
  );
}
