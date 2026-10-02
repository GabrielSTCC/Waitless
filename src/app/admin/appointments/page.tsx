"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/context/AuthContext";
import { AdminShell } from "@/components/layout/AdminShell";
import { AppointmentDayPicker } from "@/components/appointments/AppointmentDayPicker";
import { SendAppointmentLinkForm } from "@/components/appointments/SendAppointmentLinkForm";
import { formatHmInZone } from "@/lib/appointments/hours";
import { canOperateAppointmentQueue } from "@/lib/appointments/arrival-window";
import { surfaceCard } from "@/lib/ui/surface";
import { cn } from "@/lib/utils/cn";
import { buildAppointmentConfirmMessage } from "@/lib/utils/app-url";
import { normalizeWhatsapp } from "@/lib/utils/format";
import type { AppointmentStatus, Professional } from "@/lib/types";

interface AppointmentRow {
  id: string;
  clientName: string;
  clientWhatsapp: string;
  professionalId?: string;
  professionalName?: string;
  scheduledAt: string;
  status: AppointmentStatus;
  publicToken: string;
}

const LABELS: Record<AppointmentStatus, string> = {
  requested: "Solicitado",
  rejected: "Recusado",
  // Horário aceito/marcado — NÃO é confirmação de presença do cliente.
  confirmed: "Agendado",
  arrival_confirmed: "Na fila",
  in_service: "Em atendimento",
  completed: "Concluído",
  skipped: "Vez passada",
  cancelled: "Cancelado",
};

export default function AppointmentsPage() {
  const { user, member, company } = useAuth();
  const [date, setDate] = useState(() =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date()),
  );
  const [rows, setRows] = useState<AppointmentRow[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [error, setError] = useState("");
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [calendarRefresh, setCalendarRefresh] = useState(0);
  const lead = company?.reminderLeadMin ?? 30;

  const load = useCallback(async () => {
    if (!user) return;
    const token = await user.getIdToken();
    const res = await fetch(`/api/appointments?date=${date}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = (await res.json().catch(() => ({}))) as {
      appointments?: AppointmentRow[];
      professionals?: Professional[];
      error?: string;
    };
    if (!res.ok) {
      setError(data.error ?? "Não foi possível carregar.");
      return;
    }
    setError("");
    setRows(data.appointments ?? []);
    setProfessionals((data.professionals ?? []).filter((item) => item.active));
  }, [user, date]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 30_000);
    return () => window.clearInterval(timer);
  }, [load]);

  async function act(action: string, appointmentId: string, professionalId?: string) {
    if (!user) return;
    setError("");
    const token = await user.getIdToken();
    const res = await fetch("/api/appointments", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ action, appointmentId, professionalId }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setError(data.error ?? "Não foi possível concluir.");
      return;
    }
    setCalendarRefresh((n) => n + 1);
    await load();
  }

  function sendLink(row: AppointmentRow) {
    const digits = normalizeWhatsapp(row.clientWhatsapp);
    const message = buildAppointmentConfirmMessage(
      row.clientName,
      company?.name ?? "",
      row.publicToken,
      window.location.origin,
    );
    window.open(
      `https://wa.me/55${digits}?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  return (
    <AdminShell>
      <main
        id="main-content"
        className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-10 pt-14 md:px-8 md:py-6 md:pb-8 md:pt-6"
      >
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-heading text-xl font-semibold text-on-surface md:text-2xl">
              Agendamentos
            </h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              Horários do dia, confirmação e fila de quem marcou.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <AppointmentDayPicker
              value={date}
              onChange={setDate}
              getIdToken={async () => {
                if (!user) throw new Error("Unauthenticated");
                return user.getIdToken();
              }}
              refreshKey={calendarRefresh}
            />
            <button
              type="button"
              onClick={() => setShowLinkForm((open) => !open)}
              className="h-10 rounded-xl bg-primary px-4 text-sm font-medium text-on-primary"
            >
              Enviar link
            </button>
          </div>
        </div>
        {company && !company.appointmentsEnabled && (
          <p className={cn(surfaceCard, "px-4 py-3 text-sm text-on-surface")}>
            Ligue o agendamento em{" "}
            <Link href="/admin/settings" className="font-medium text-primary">
              Configurações
            </Link>{" "}
            para marcar horários e enviar o link.
          </p>
        )}
        {showLinkForm && member?.companyId && (
          <SendAppointmentLinkForm
            companyId={member.companyId}
            companyName={company?.name ?? ""}
            serviceMode={company?.serviceMode ?? "single"}
            professionals={professionals}
            onBooked={(bookedDate) => {
              setDate(bookedDate);
              setCalendarRefresh((n) => n + 1);
              void load();
            }}
            onClose={() => setShowLinkForm(false)}
          />
        )}
        {error && <p className="text-sm text-red-700">{error}</p>}
        {rows.length === 0 ? (
          <div className={cn(surfaceCard, "px-6 py-12 text-center")}>
            <p className="font-heading text-lg font-semibold text-on-surface">
              Nenhum agendamento neste dia
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm text-on-surface-variant">
              Escolha outra data ou envie um link para o cliente marcar o horário.
            </p>
          </div>
        ) : (
        <ul className="space-y-3">
          {rows.map((row) => {
            const when = new Date(row.scheduledAt);
            const canOperateToday = canOperateAppointmentQueue(when);
            const canSend =
              row.status === "confirmed" &&
              when.getTime() - Date.now() <= lead * 60_000;
            const showQueueActions =
              row.status === "arrival_confirmed" && canOperateToday;
            return (
              <li key={row.id} className={cn(surfaceCard, "flex flex-wrap items-center justify-between gap-3 p-4")}>
                <div>
                  <p className="font-heading text-lg font-semibold tabular-nums text-on-surface">
                    {formatHmInZone(when)}
                  </p>
                  <p className="font-medium text-on-surface">{row.clientName}</p>
                  <p className="text-sm text-on-surface-variant">
                    {LABELS[row.status]}
                    {row.professionalName ? ` · ${row.professionalName}` : ""}
                  </p>
                  {row.status === "arrival_confirmed" && !canOperateToday && (
                    <p className="mt-1 text-xs text-on-surface-variant">
                      Chamar e passar o próximo liberam só no dia do horário.
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {row.status === "requested" && (
                    <>
                      <button type="button" className="rounded-lg bg-primary px-3 py-1.5 text-sm text-on-primary" onClick={() => void act("confirm", row.id)}>
                        Confirmar
                      </button>
                      <button type="button" className="rounded-lg border border-outline-variant px-3 py-1.5 text-sm" onClick={() => void act("reject", row.id)}>
                        Recusar
                      </button>
                    </>
                  )}
                  {canSend && (
                    <button type="button" className="rounded-lg border border-outline-variant px-3 py-1.5 text-sm" onClick={() => sendLink(row)}>
                      Enviar confirmação
                    </button>
                  )}
                  {showQueueActions && company?.serviceMode !== "pool" && (
                    <>
                      <button type="button" className="rounded-lg bg-primary px-3 py-1.5 text-sm text-on-primary" onClick={() => void act("call", row.id)}>
                        Chamar
                      </button>
                      <button type="button" className="rounded-lg border border-outline-variant px-3 py-1.5 text-sm" onClick={() => void act("pass", row.id)}>
                        Passar o próximo
                      </button>
                    </>
                  )}
                  {showQueueActions && company?.serviceMode === "pool" && (
                    <>
                      <button type="button" className="rounded-lg border border-outline-variant px-3 py-1.5 text-sm" onClick={() => void act("pass", row.id)}>
                        Passar o próximo
                      </button>
                      {professionals.length === 0 ? (
                        <button type="button" className="rounded-lg bg-primary px-3 py-1.5 text-sm text-on-primary" onClick={() => void act("call", row.id)}>
                          Chamar
                        </button>
                      ) : (
                        <select
                          className="rounded-lg border border-outline-variant px-2 text-sm"
                          defaultValue=""
                          onChange={(event) => {
                            if (event.target.value) void act("call", row.id, event.target.value);
                          }}
                        >
                          <option value="">Chamar profissional livre</option>
                          {professionals.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        )}
      </div>
      </main>
    </AdminShell>
  );
}
