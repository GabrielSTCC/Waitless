"use client";

import { useEffect, useState } from "react";
import { CalendarClock } from "lucide-react";
import { auth } from "@/lib/firebase/config";
import { SettingsLabel } from "@/components/settings/SettingsLabel";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { settingsInputClass } from "@/components/settings/SettingsField";
import { useTranslations } from "@/components/providers/LocaleProvider";
import { WEEKDAY_KEYS } from "@/lib/appointments/hours";
import { surfaceSegmentOptionActive, surfaceSegmentTrack } from "@/lib/ui/surface";
import { cn } from "@/lib/utils/cn";
import type {
  BusinessHours,
  CalendarException,
  Professional,
  ServiceMode,
  WeekdayKey,
} from "@/lib/types";

const WEEKDAY_LABEL: Record<WeekdayKey, string> = {
  sun: "weekdaySun",
  mon: "weekdayMon",
  tue: "weekdayTue",
  wed: "weekdayWed",
  thu: "weekdayThu",
  fri: "weekdayFri",
  sat: "weekdaySat",
};

export interface AppointmentSettingsValues {
  arrivalConfirmRequired: boolean;
  arrivalConfirmOpenMin: number;
  arrivalConfirmDeadlineMin: number;
  autoJoinLeadMin: number;
  minBookAheadMin: number;
  maxBookAheadDays: number;
  slotBufferMin: number;
}

interface AppointmentSettingsSectionProps {
  companyId: string;
  canEdit: boolean;
  enabled: boolean;
  mode: ServiceMode;
  leadMin: number;
  hours: BusinessHours;
  values: AppointmentSettingsValues;
  onEnabled: (value: boolean) => void;
  onMode: (value: ServiceMode) => void;
  onLead: (value: number) => void;
  onHours: (value: BusinessHours) => void;
  onValues: (patch: Partial<AppointmentSettingsValues>) => void;
}

export function AppointmentSettingsSection({
  companyId,
  canEdit,
  enabled,
  mode,
  leadMin,
  hours,
  values,
  onEnabled,
  onMode,
  onLead,
  onHours,
  onValues,
}: Readonly<AppointmentSettingsSectionProps>) {
  const { t } = useTranslations("settings");
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [exceptions, setExceptions] = useState<CalendarException[]>([]);
  const [exDate, setExDate] = useState("");
  const [exType, setExType] = useState<"closed" | "hours_override">("closed");
  const [exStart, setExStart] = useState("09:00");
  const [exEnd, setExEnd] = useState("13:00");
  const [exNote, setExNote] = useState("");
  const [exBusy, setExBusy] = useState(false);

  useEffect(() => {
    if (mode === "single") return;
    const user = auth.currentUser;
    if (!user) return;
    let cancelled = false;
    void user.getIdToken().then(async (token) => {
      const today = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Sao_Paulo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());
      const res = await fetch(`/api/appointments?date=${today}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json().catch(() => ({}))) as { professionals?: Professional[] };
      if (!cancelled && data.professionals) setProfessionals(data.professionals);
    }).catch(() => {
      if (!cancelled) setProfessionals([]);
    });
    return () => {
      cancelled = true;
    };
  }, [mode, companyId]);

  useEffect(() => {
    if (!enabled) return;
    const user = auth.currentUser;
    if (!user) return;
    let cancelled = false;
    void user.getIdToken().then(async (token) => {
      const res = await fetch("/api/appointments/calendar-exceptions", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json().catch(() => ({}))) as {
        exceptions?: CalendarException[];
      };
      if (!cancelled && data.exceptions) setExceptions(data.exceptions);
    }).catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [enabled, companyId]);

  async function addProfessional() {
    setError("");
    const user = auth.currentUser;
    if (!user || name.trim().length < 2) return;
    const token = await user.getIdToken();
    const res = await fetch("/api/appointments", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add_professional", name }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      professional?: Professional;
      error?: string;
    };
    if (!res.ok || !data.professional) {
      setError(data.error ?? "Não foi possível adicionar.");
      return;
    }
    setProfessionals((current) => [...current, data.professional!]);
    setName("");
  }

  async function saveException() {
    setError("");
    const user = auth.currentUser;
    if (!user || !exDate) return;
    setExBusy(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/appointments/calendar-exceptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          date: exDate,
          type: exType,
          start: exType === "hours_override" ? exStart : undefined,
          end: exType === "hours_override" ? exEnd : undefined,
          note: exNote || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        exception?: CalendarException;
        error?: string;
      };
      if (!res.ok || !data.exception) {
        setError(data.error ?? "Não foi possível salvar o dia.");
        return;
      }
      setExceptions((current) => {
        const without = current.filter((item) => item.date !== data.exception!.date);
        return [...without, data.exception!].sort((a, b) => a.date.localeCompare(b.date));
      });
      setExDate("");
      setExNote("");
    } finally {
      setExBusy(false);
    }
  }

  async function removeException(date: string) {
    const user = auth.currentUser;
    if (!user) return;
    const token = await user.getIdToken();
    const res = await fetch(`/api/appointments/calendar-exceptions?date=${date}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    setExceptions((current) => current.filter((item) => item.date !== date));
  }

  function updateDay(key: WeekdayKey, patch: Partial<BusinessHours[WeekdayKey]>) {
    onHours({ ...hours, [key]: { ...hours[key], ...patch } });
  }

  return (
    <SettingsSection
      title={t("appointmentsTitle")}
      description={t("appointmentsHint")}
      icon={CalendarClock}
    >
      <div className={cn("flex h-10 max-w-xs", surfaceSegmentTrack)}>
        <button
          type="button"
          disabled={!canEdit}
          onClick={() => onEnabled(false)}
          className={cn(
            "flex-1 rounded-lg text-xs font-medium",
            !enabled ? surfaceSegmentOptionActive : "text-on-surface-variant",
          )}
        >
          {t("appointmentsOff")}
        </button>
        <button
          type="button"
          disabled={!canEdit}
          onClick={() => onEnabled(true)}
          className={cn(
            "flex-1 rounded-lg text-xs font-medium",
            enabled ? surfaceSegmentOptionActive : "text-on-surface-variant",
          )}
        >
          {t("appointmentsOn")}
        </button>
      </div>

      {enabled && (
        <div className="mt-5 space-y-5">
          <div>
            <SettingsLabel>{t("appointmentsMode")}</SettingsLabel>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {(
                [
                  ["single", t("appointmentsModeSingle")],
                  ["per_professional", t("appointmentsModePro")],
                  ["pool", t("appointmentsModePool")],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  disabled={!canEdit}
                  onClick={() => onMode(value)}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-sm",
                    mode === value
                      ? "border-primary bg-primary/10 font-medium text-on-surface"
                      : "border-outline-variant text-on-surface-variant",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <SettingsLabel>{t("appointmentsLead")}</SettingsLabel>
            <p className="mb-2 text-xs text-on-surface-variant">{t("appointmentsLeadHint")}</p>
            <input
              type="number"
              min={5}
              max={180}
              disabled={!canEdit}
              value={leadMin}
              onChange={(event) => onLead(Number(event.target.value))}
              className={cn(settingsInputClass, "w-24")}
            />
          </div>

          <div>
            <SettingsLabel>{t("appointmentsConfirmRequired")}</SettingsLabel>
            <p className="mb-2 text-xs text-on-surface-variant">
              {t("appointmentsConfirmRequiredHint")}
            </p>
            <div className={cn("flex h-10 max-w-xs", surfaceSegmentTrack)}>
              <button
                type="button"
                disabled={!canEdit}
                onClick={() => onValues({ arrivalConfirmRequired: true })}
                className={cn(
                  "flex-1 rounded-lg text-xs font-medium",
                  values.arrivalConfirmRequired
                    ? surfaceSegmentOptionActive
                    : "text-on-surface-variant",
                )}
              >
                {t("appointmentsConfirmOn")}
              </button>
              <button
                type="button"
                disabled={!canEdit}
                onClick={() => onValues({ arrivalConfirmRequired: false })}
                className={cn(
                  "flex-1 rounded-lg text-xs font-medium",
                  !values.arrivalConfirmRequired
                    ? surfaceSegmentOptionActive
                    : "text-on-surface-variant",
                )}
              >
                {t("appointmentsConfirmOff")}
              </button>
            </div>
          </div>

          {values.arrivalConfirmRequired ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <SettingsLabel>{t("appointmentsConfirmOpen")}</SettingsLabel>
                <p className="mb-2 text-xs text-on-surface-variant">
                  {t("appointmentsConfirmOpenHint")}
                </p>
                <input
                  type="number"
                  min={15}
                  max={720}
                  disabled={!canEdit}
                  value={values.arrivalConfirmOpenMin}
                  onChange={(event) =>
                    onValues({ arrivalConfirmOpenMin: Number(event.target.value) })
                  }
                  className={cn(settingsInputClass, "w-24")}
                />
              </div>
              <div>
                <SettingsLabel>{t("appointmentsConfirmDeadline")}</SettingsLabel>
                <p className="mb-2 text-xs text-on-surface-variant">
                  {t("appointmentsConfirmDeadlineHint")}
                </p>
                <input
                  type="number"
                  min={0}
                  max={360}
                  disabled={!canEdit}
                  value={values.arrivalConfirmDeadlineMin}
                  onChange={(event) =>
                    onValues({ arrivalConfirmDeadlineMin: Number(event.target.value) })
                  }
                  className={cn(settingsInputClass, "w-24")}
                />
              </div>
            </div>
          ) : (
            <div>
              <SettingsLabel>{t("appointmentsAutoJoinLead")}</SettingsLabel>
              <p className="mb-2 text-xs text-on-surface-variant">
                {t("appointmentsAutoJoinLeadHint")}
              </p>
              <input
                type="number"
                min={0}
                max={180}
                disabled={!canEdit}
                value={values.autoJoinLeadMin}
                onChange={(event) => onValues({ autoJoinLeadMin: Number(event.target.value) })}
                className={cn(settingsInputClass, "w-24")}
              />
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <SettingsLabel>{t("appointmentsMinAhead")}</SettingsLabel>
              <input
                type="number"
                min={0}
                max={1440}
                disabled={!canEdit}
                value={values.minBookAheadMin}
                onChange={(event) => onValues({ minBookAheadMin: Number(event.target.value) })}
                className={cn(settingsInputClass, "mt-2 w-24")}
              />
            </div>
            <div>
              <SettingsLabel>{t("appointmentsMaxDays")}</SettingsLabel>
              <input
                type="number"
                min={1}
                max={180}
                disabled={!canEdit}
                value={values.maxBookAheadDays}
                onChange={(event) => onValues({ maxBookAheadDays: Number(event.target.value) })}
                className={cn(settingsInputClass, "mt-2 w-24")}
              />
            </div>
            <div>
              <SettingsLabel>{t("appointmentsBuffer")}</SettingsLabel>
              <input
                type="number"
                min={0}
                max={120}
                disabled={!canEdit}
                value={values.slotBufferMin}
                onChange={(event) => onValues({ slotBufferMin: Number(event.target.value) })}
                className={cn(settingsInputClass, "mt-2 w-24")}
              />
            </div>
          </div>

          <div>
            <SettingsLabel>{t("appointmentsHours")}</SettingsLabel>
            <ul className="mt-2 space-y-2">
              {WEEKDAY_KEYS.map((key) => (
                <li key={key} className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="w-24">{t(WEEKDAY_LABEL[key])}</span>
                  <label className="flex items-center gap-1 text-xs text-on-surface-variant">
                    <input
                      type="checkbox"
                      checked={hours[key].closed}
                      disabled={!canEdit}
                      onChange={(event) => updateDay(key, { closed: event.target.checked })}
                    />
                    {t("appointmentsClosed")}
                  </label>
                  {!hours[key].closed && (
                    <>
                      <input
                        type="time"
                        disabled={!canEdit}
                        value={hours[key].start}
                        onChange={(event) => updateDay(key, { start: event.target.value })}
                        className={cn(settingsInputClass, "w-28")}
                      />
                      <input
                        type="time"
                        disabled={!canEdit}
                        value={hours[key].end}
                        onChange={(event) => updateDay(key, { end: event.target.value })}
                        className={cn(settingsInputClass, "w-28")}
                      />
                    </>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <SettingsLabel>{t("appointmentsCalendar")}</SettingsLabel>
            <p className="mb-2 text-xs text-on-surface-variant">{t("appointmentsCalendarHint")}</p>
            <div className="flex flex-wrap items-end gap-2">
              <input
                type="date"
                disabled={!canEdit || exBusy}
                value={exDate}
                onChange={(event) => setExDate(event.target.value)}
                className={cn(settingsInputClass, "w-40")}
              />
              <select
                disabled={!canEdit || exBusy}
                value={exType}
                onChange={(event) =>
                  setExType(event.target.value === "hours_override" ? "hours_override" : "closed")
                }
                className={cn(settingsInputClass, "w-40")}
              >
                <option value="closed">{t("appointmentsCalendarClosed")}</option>
                <option value="hours_override">{t("appointmentsCalendarOverride")}</option>
              </select>
              {exType === "hours_override" && (
                <>
                  <input
                    type="time"
                    disabled={!canEdit || exBusy}
                    value={exStart}
                    onChange={(event) => setExStart(event.target.value)}
                    className={cn(settingsInputClass, "w-28")}
                  />
                  <input
                    type="time"
                    disabled={!canEdit || exBusy}
                    value={exEnd}
                    onChange={(event) => setExEnd(event.target.value)}
                    className={cn(settingsInputClass, "w-28")}
                  />
                </>
              )}
              <input
                disabled={!canEdit || exBusy}
                value={exNote}
                onChange={(event) => setExNote(event.target.value)}
                placeholder={t("appointmentsCalendarNote")}
                className={cn(settingsInputClass, "min-w-[8rem] flex-1")}
              />
              {canEdit && (
                <button
                  type="button"
                  disabled={exBusy || !exDate}
                  onClick={() => void saveException()}
                  className="rounded-xl bg-primary px-3 py-2 text-sm font-medium text-on-primary disabled:opacity-60"
                >
                  {t("appointmentsCalendarAdd")}
                </button>
              )}
            </div>
            <ul className="mt-3 space-y-1 text-sm">
              {exceptions.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-outline-variant px-3 py-2"
                >
                  <span>
                    {item.date}
                    {" · "}
                    {item.type === "closed"
                      ? t("appointmentsCalendarClosed")
                      : `${item.start ?? ""}–${item.end ?? ""}`}
                    {item.note ? ` · ${item.note}` : ""}
                  </span>
                  {canEdit && (
                    <button
                      type="button"
                      className="text-xs text-on-surface-variant underline"
                      onClick={() => void removeException(item.date)}
                    >
                      {t("appointmentsCalendarRemove")}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {mode !== "single" && (
            <div>
              <SettingsLabel>{t("appointmentsProfessionals")}</SettingsLabel>
              <ul className="mt-2 space-y-1 text-sm">
                {professionals.filter((item) => item.active).map((item) => (
                  <li key={item.id}>{item.name}</li>
                ))}
              </ul>
              {canEdit && (
                <div className="mt-2 flex gap-2">
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className={settingsInputClass}
                    placeholder={t("appointmentsProfessionalAdd")}
                  />
                  <button
                    type="button"
                    onClick={() => void addProfessional()}
                    className="rounded-xl bg-primary px-3 text-sm font-medium text-on-primary"
                  >
                    {t("appointmentsProfessionalAdd")}
                  </button>
                </div>
              )}
            </div>
          )}
          {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
        </div>
      )}
    </SettingsSection>
  );
}
