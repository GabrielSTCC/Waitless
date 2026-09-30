import { normalizeBusinessHours } from "@/lib/appointments/hours";
import type { BusinessHours, ServiceMode } from "@/lib/types";

export function parseServiceMode(value: unknown): ServiceMode {
  if (value === "per_professional" || value === "pool" || value === "single") return value;
  return "single";
}

export function readAppointmentCompanyFields(data: Record<string, unknown>): {
  appointmentsEnabled: boolean;
  serviceMode: ServiceMode;
  reminderLeadMin: number;
  businessHours: BusinessHours;
} {
  const lead = data.reminderLeadMin;
  const reminderLeadMin =
    typeof lead === "number" && Number.isFinite(lead)
      ? Math.min(180, Math.max(5, Math.round(lead)))
      : 30;
  return {
    appointmentsEnabled: data.appointmentsEnabled === true,
    serviceMode: parseServiceMode(data.serviceMode),
    reminderLeadMin,
    businessHours: normalizeBusinessHours(data.businessHours),
  };
}
