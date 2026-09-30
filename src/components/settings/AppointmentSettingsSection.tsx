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
import type { BusinessHours, Professional, ServiceMode, WeekdayKey } from "@/lib/types";

const WEEKDAY_LABEL: Record<WeekdayKey, string> = {
  sun: "weekdaySun",
  mon: "weekdayMon",
  tue: "weekdayTue",
  wed: "weekdayWed",
  thu: "weekdayThu",
  fri: "weekdayFri",
  sat: "weekdaySat",
};

interface AppointmentSettingsSectionProps {
  companyId: string;
  canEdit: boolean;
  enabled: boolean;
  mode: ServiceMode;
  leadMin: number;
  hours: BusinessHours;
  onEnabled: (value: boolean) => void;
  onMode: (value: ServiceMode) => void;
  onLead: (value: number) => void;
  onHours: (value: BusinessHours) => void;
}

export function AppointmentSettingsSection({
  companyId,
  canEdit,
  enabled,
  mode,
  leadMin,
  hours,
  onEnabled,
  onMode,
  onLead,
  onHours,
}: Readonly<AppointmentSettingsSectionProps>) {
  const { t } = useTranslations("settings");
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState("");

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
              {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
            </div>
          )}
        </div>
      )}
    </SettingsSection>
  );
}
