import { APPOINTMENT_TIME_ZONE } from "@/lib/appointments/hours";

export type ArrivalConfirmPhase = "not_today" | "open" | "deadline_passed";

export function dateISOInZone(
  date: Date,
  timeZone = APPOINTMENT_TIME_ZONE,
): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function isSameZoneDay(
  a: Date,
  b: Date,
  timeZone = APPOINTMENT_TIME_ZONE,
): boolean {
  return dateISOInZone(a, timeZone) === dateISOInZone(b, timeZone);
}

/**
 * Avalia se o cliente pode confirmar presença no dia do horário.
 * - not_today: ainda não é o dia civil do slot (America/Sao_Paulo)
 * - open: mesmo dia e agora <= scheduledAt
 * - deadline_passed: mesmo dia mas o horário já passou
 */
export function evaluateArrivalWindow(
  scheduledAt: Date,
  now: Date = new Date(),
): ArrivalConfirmPhase {
  if (!isSameZoneDay(scheduledAt, now)) {
    return "not_today";
  }
  if (now.getTime() > scheduledAt.getTime()) {
    return "deadline_passed";
  }
  return "open";
}

export function arrivalWindowErrorMessage(phase: ArrivalConfirmPhase): string {
  switch (phase) {
    case "not_today":
      return "A confirmação só fica disponível no dia do horário marcado.";
    case "deadline_passed":
      return "O prazo para confirmar este horário já passou.";
    default:
      return "Não é possível confirmar neste momento.";
  }
}

/** Staff só chama / passa o próximo no dia civil do horário (America/Sao_Paulo). */
export function canOperateAppointmentQueue(
  scheduledAt: Date,
  now: Date = new Date(),
): boolean {
  return isSameZoneDay(scheduledAt, now);
}

export function appointmentQueueDayErrorMessage(): string {
  return "Só é possível chamar ou passar o próximo no dia do horário marcado.";
}
