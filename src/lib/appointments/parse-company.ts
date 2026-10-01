import { normalizeBusinessHours } from "@/lib/appointments/hours";
import type { BusinessHours, ServiceMode } from "@/lib/types";

export function parseServiceMode(value: unknown): ServiceMode {
  if (value === "per_professional" || value === "pool" || value === "single") return value;
  return "single";
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function readAppointmentCompanyFields(data: Record<string, unknown>): {
  appointmentsEnabled: boolean;
  serviceMode: ServiceMode;
  reminderLeadMin: number;
  businessHours: BusinessHours;
  arrivalConfirmRequired: boolean;
  arrivalConfirmOpenMin: number;
  arrivalConfirmDeadlineMin: number;
  autoJoinLeadMin: number;
  minBookAheadMin: number;
  maxBookAheadDays: number;
  slotBufferMin: number;
} {
  return {
    appointmentsEnabled: data.appointmentsEnabled === true,
    serviceMode: parseServiceMode(data.serviceMode),
    reminderLeadMin: clampInt(data.reminderLeadMin, 5, 180, 30),
    businessHours: normalizeBusinessHours(data.businessHours),
    arrivalConfirmRequired: data.arrivalConfirmRequired !== false,
    arrivalConfirmOpenMin: clampInt(data.arrivalConfirmOpenMin, 15, 720, 120),
    arrivalConfirmDeadlineMin: clampInt(data.arrivalConfirmDeadlineMin, 0, 360, 0),
    autoJoinLeadMin: clampInt(data.autoJoinLeadMin, 0, 180, 0),
    minBookAheadMin: clampInt(data.minBookAheadMin, 0, 1440, 60),
    maxBookAheadDays: clampInt(data.maxBookAheadDays, 1, 180, 30),
    slotBufferMin: clampInt(data.slotBufferMin, 0, 120, 0),
  };
}
