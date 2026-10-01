import type {
  BusinessHours,
  BusinessHoursDay,
  CalendarException,
  WeekdayKey,
} from "@/lib/types";

export const APPOINTMENT_TIME_ZONE = "America/Sao_Paulo";

export const WEEKDAY_KEYS: WeekdayKey[] = [
  "sun",
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
];

const WEEKDAY_FROM_SHORT: Record<string, WeekdayKey> = {
  Sun: "sun",
  Mon: "mon",
  Tue: "tue",
  Wed: "wed",
  Thu: "thu",
  Fri: "fri",
  Sat: "sat",
};

function openDay(closed: boolean): BusinessHoursDay {
  return { closed, start: "09:00", end: "18:00" };
}

export function defaultBusinessHours(): BusinessHours {
  return {
    sun: openDay(true),
    mon: openDay(false),
    tue: openDay(false),
    wed: openDay(false),
    thu: openDay(false),
    fri: openDay(false),
    sat: openDay(false),
  };
}

function isHm(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function normalizeBusinessHours(raw: unknown): BusinessHours {
  const fallback = defaultBusinessHours();
  if (!raw || typeof raw !== "object") return fallback;
  const source = raw as Record<string, unknown>;
  const hours = { ...fallback };
  for (const key of WEEKDAY_KEYS) {
    const day = source[key];
    if (!day || typeof day !== "object") continue;
    const record = day as Record<string, unknown>;
    const start = typeof record.start === "string" && isHm(record.start) ? record.start : "09:00";
    const end = typeof record.end === "string" && isHm(record.end) ? record.end : "18:00";
    hours[key] = {
      closed: record.closed === true,
      start,
      end: end > start ? end : "18:00",
    };
  }
  return hours;
}

function tzOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const read = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  const asUtc = Date.UTC(
    read("year"),
    read("month") - 1,
    read("day"),
    read("hour"),
    read("minute"),
    read("second"),
  );
  return asUtc - date.getTime();
}

export function zonedDateTime(
  dateISO: string,
  hm: string,
  timeZone = APPOINTMENT_TIME_ZONE,
): Date | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateISO);
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(hm);
  if (!dateMatch || !timeMatch) return null;
  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute);
  const offset = tzOffsetMs(new Date(utcGuess), timeZone);
  const corrected = utcGuess - offset;
  const offset2 = tzOffsetMs(new Date(corrected), timeZone);
  return new Date(utcGuess - offset2);
}

export function weekdayKeyInZone(date: Date, timeZone = APPOINTMENT_TIME_ZONE): WeekdayKey {
  const short = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(date);
  return WEEKDAY_FROM_SHORT[short] ?? "mon";
}

export function formatHmInZone(date: Date, timeZone = APPOINTMENT_TIME_ZONE): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

/** Aplica exceção de calendário sobre a grade semanal do dia. */
export function effectiveHoursForDate(
  dateISO: string,
  hours: BusinessHours,
  exception?: Pick<CalendarException, "type" | "start" | "end"> | null,
): BusinessHoursDay | null {
  const dayStart = zonedDateTime(dateISO, "12:00");
  if (!dayStart) return null;
  if (exception?.type === "closed") {
    return { closed: true, start: "09:00", end: "18:00" };
  }
  if (exception?.type === "hours_override" && exception.start && exception.end) {
    return {
      closed: false,
      start: exception.start,
      end: exception.end > exception.start ? exception.end : exception.start,
    };
  }
  return hours[weekdayKeyInZone(dayStart)] ?? null;
}

export function listOpenSlots(input: {
  dateISO: string;
  hours: BusinessHours;
  durationMin: number;
  takenAt: number[];
  now?: Date;
  exception?: Pick<CalendarException, "type" | "start" | "end"> | null;
  bufferMin?: number;
  minBookAheadMin?: number;
  maxBookAheadDays?: number;
}): Date[] {
  const day = effectiveHoursForDate(input.dateISO, input.hours, input.exception);
  if (!day || day.closed) return [];
  const open = zonedDateTime(input.dateISO, day.start);
  const close = zonedDateTime(input.dateISO, day.end);
  if (!open || !close) return [];
  const stepMin = Math.max(5, input.durationMin) + Math.max(0, input.bufferMin ?? 0);
  const durationMs = Math.max(5, input.durationMin) * 60_000;
  const stepMs = stepMin * 60_000;
  const taken = new Set(input.takenAt);
  const now = input.now ?? new Date();
  const minAheadMs = Math.max(0, input.minBookAheadMin ?? 0) * 60_000;
  const earliestBookable = now.getTime() + minAheadMs;
  const maxDays = Math.max(1, input.maxBookAheadDays ?? 30);
  const maxBookable = now.getTime() + maxDays * 24 * 60 * 60_000;
  const dayNoon = zonedDateTime(input.dateISO, "12:00");
  if (dayNoon && dayNoon.getTime() > maxBookable) return [];
  const slots: Date[] = [];
  for (let cursor = open.getTime(); cursor + durationMs <= close.getTime(); cursor += stepMs) {
    if (cursor <= earliestBookable) continue;
    if (taken.has(cursor)) continue;
    slots.push(new Date(cursor));
  }
  return slots;
}

export function appointmentEtaMin(input: {
  scheduledAt: Date;
  peopleAhead: number;
  inServiceCount: number;
  avgMin: number;
  now?: Date;
}): number {
  const now = input.now ?? new Date();
  const untilSlot = Math.max(0, Math.round((input.scheduledAt.getTime() - now.getTime()) / 60_000));
  const queueMin = Math.max(0, input.peopleAhead + input.inServiceCount) * Math.max(1, input.avgMin);
  // Evita ETA absurdo quando o horário ainda está longe — prioriza a fila real no dia.
  const cappedUntil = Math.min(untilSlot, Math.max(queueMin, input.avgMin * 4));
  return Math.max(cappedUntil, queueMin);
}
