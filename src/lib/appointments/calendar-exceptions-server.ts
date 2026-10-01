import type { Firestore } from "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";
import type { CalendarException, CalendarExceptionType } from "@/lib/types";

function isHm(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function parseCalendarExceptionInput(raw: Record<string, unknown>): {
  date: string;
  type: CalendarExceptionType;
  start?: string;
  end?: string;
  note?: string;
} {
  const date = typeof raw.date === "string" ? raw.date.trim() : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("Informe a data no formato AAAA-MM-DD.");
  }
  const type = raw.type === "hours_override" ? "hours_override" : "closed";
  const start =
    typeof raw.start === "string" && isHm(raw.start) ? raw.start : undefined;
  const end = typeof raw.end === "string" && isHm(raw.end) ? raw.end : undefined;
  if (type === "hours_override") {
    if (!start || !end || end <= start) {
      throw new Error("Horário especial precisa de início e fim válidos.");
    }
  }
  const note = typeof raw.note === "string" ? raw.note.trim().slice(0, 120) : undefined;
  return { date, type, start, end, note };
}

export async function listCalendarExceptions(
  db: Firestore,
  companyId: string,
): Promise<CalendarException[]> {
  const snap = await db.collection(`companies/${companyId}/calendarExceptions`).get();
  return snap.docs
    .map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        date: (data.date as string) || doc.id,
        type: data.type === "hours_override" ? ("hours_override" as const) : ("closed" as const),
        start: typeof data.start === "string" ? data.start : undefined,
        end: typeof data.end === "string" ? data.end : undefined,
        note: typeof data.note === "string" ? data.note : undefined,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function getCalendarExceptionForDate(
  db: Firestore,
  companyId: string,
  dateISO: string,
): Promise<CalendarException | null> {
  const snap = await db.doc(`companies/${companyId}/calendarExceptions/${dateISO}`).get();
  if (!snap.exists) return null;
  const data = snap.data()!;
  return {
    id: snap.id,
    date: (data.date as string) || snap.id,
    type: data.type === "hours_override" ? "hours_override" : "closed",
    start: typeof data.start === "string" ? data.start : undefined,
    end: typeof data.end === "string" ? data.end : undefined,
    note: typeof data.note === "string" ? data.note : undefined,
  };
}

export async function upsertCalendarException(
  db: Firestore,
  companyId: string,
  input: {
    date: string;
    type: CalendarExceptionType;
    start?: string;
    end?: string;
    note?: string;
  },
): Promise<CalendarException> {
  const ref = db.doc(`companies/${companyId}/calendarExceptions/${input.date}`);
  const payload: Record<string, unknown> = {
    date: input.date,
    type: input.type,
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (input.type === "hours_override") {
    payload.start = input.start;
    payload.end = input.end;
  } else {
    payload.start = FieldValue.delete();
    payload.end = FieldValue.delete();
  }
  if (input.note) payload.note = input.note;
  else payload.note = FieldValue.delete();
  await ref.set(payload, { merge: true });
  return {
    id: input.date,
    date: input.date,
    type: input.type,
    start: input.start,
    end: input.end,
    note: input.note,
  };
}

export async function deleteCalendarException(
  db: Firestore,
  companyId: string,
  dateISO: string,
): Promise<void> {
  await db.doc(`companies/${companyId}/calendarExceptions/${dateISO}`).delete();
}
