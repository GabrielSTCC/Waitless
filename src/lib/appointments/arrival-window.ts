import { APPOINTMENT_TIME_ZONE } from "@/lib/appointments/hours";

export type ArrivalConfirmPhase =
  | "not_today"
  | "too_early"
  | "open"
  | "deadline_passed"
  | "auto_join";

export interface ArrivalWindowConfig {
  arrivalConfirmRequired: boolean;
  arrivalConfirmOpenMin: number;
  arrivalConfirmDeadlineMin: number;
  autoJoinLeadMin: number;
}

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

/** Avalia se o cliente pode confirmar presença / se deve auto-entrar. */
export function evaluateArrivalWindow(
  scheduledAt: Date,
  config: ArrivalWindowConfig,
  now: Date = new Date(),
): ArrivalConfirmPhase {
  if (!isSameZoneDay(scheduledAt, now)) {
    return "not_today";
  }

  if (!config.arrivalConfirmRequired) {
    const joinAt = scheduledAt.getTime() - config.autoJoinLeadMin * 60_000;
    return now.getTime() >= joinAt ? "auto_join" : "too_early";
  }

  const openAt = scheduledAt.getTime() - config.arrivalConfirmOpenMin * 60_000;
  if (now.getTime() < openAt) {
    return "too_early";
  }

  if (config.arrivalConfirmDeadlineMin > 0) {
    const deadlineAt =
      scheduledAt.getTime() - config.arrivalConfirmDeadlineMin * 60_000;
    if (now.getTime() > deadlineAt) {
      return "deadline_passed";
    }
  } else if (now.getTime() > scheduledAt.getTime()) {
    return "deadline_passed";
  }

  return "open";
}

export function arrivalWindowErrorMessage(phase: ArrivalConfirmPhase): string {
  switch (phase) {
    case "not_today":
      return "A confirmação só fica disponível no dia do horário marcado.";
    case "too_early":
      return "Ainda não está na janela de confirmação deste horário.";
    case "deadline_passed":
      return "O prazo para confirmar este horário já passou.";
    case "auto_join":
      return "Este horário entra na fila automaticamente.";
    default:
      return "Não é possível confirmar neste momento.";
  }
}
