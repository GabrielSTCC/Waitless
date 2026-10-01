"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { APPOINTMENT_TIME_ZONE } from "@/lib/appointments/hours";
import { surfaceDropdown } from "@/lib/ui/surface";
import { cn } from "@/lib/utils/cn";

interface AppointmentDayPickerProps {
  value: string;
  onChange: (dateISO: string) => void;
  getIdToken: () => Promise<string>;
  /** Incrementar após criar/alterar agendamento para refrescar os marcadores. */
  refreshKey?: number;
  className?: string;
}

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"] as const;

const MONTH_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  timeZone: APPOINTMENT_TIME_ZONE,
  month: "long",
  year: "numeric",
});

const TRIGGER_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  timeZone: APPOINTMENT_TIME_ZONE,
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function todayISO(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APPOINTMENT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function parseISODate(value: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

function toISODate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function shiftMonth(year: number, month: number, delta: number) {
  const date = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

function buildGrid(year: number, month: number) {
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const prevMonthDays = new Date(Date.UTC(year, month - 1, 0)).getUTCDate();
  const cells: Array<{ iso: string; day: number; inMonth: boolean }> = [];

  for (let i = firstWeekday - 1; i >= 0; i -= 1) {
    const day = prevMonthDays - i;
    const prev = shiftMonth(year, month, -1);
    cells.push({ iso: toISODate(prev.year, prev.month, day), day, inMonth: false });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ iso: toISODate(year, month, day), day, inMonth: true });
  }

  const trailing = (7 - (cells.length % 7)) % 7;
  const next = shiftMonth(year, month, 1);
  for (let day = 1; day <= trailing; day += 1) {
    cells.push({ iso: toISODate(next.year, next.month, day), day, inMonth: false });
  }

  return cells;
}

export function AppointmentDayPicker({
  value,
  onChange,
  getIdToken,
  refreshKey = 0,
  className,
}: Readonly<AppointmentDayPickerProps>) {
  const parsed = parseISODate(value) ?? parseISODate(todayISO())!;
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(parsed.year);
  const [viewMonth, setViewMonth] = useState(parsed.month);
  const [markers, setMarkers] = useState<Record<string, number>>({});
  const [loadingMarkers, setLoadingMarkers] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  const monthKey = `${viewYear}-${String(viewMonth).padStart(2, "0")}`;
  const today = todayISO();
  const cells = useMemo(() => buildGrid(viewYear, viewMonth), [viewYear, viewMonth]);
  const monthLabel = MONTH_FORMATTER.format(new Date(Date.UTC(viewYear, viewMonth - 1, 15)));

  const loadMarkers = useCallback(async () => {
    setLoadingMarkers(true);
    try {
      const token = await getIdToken();
      const res = await fetch(`/api/appointments?month=${monthKey}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json().catch(() => ({}))) as {
        markers?: Record<string, number>;
      };
      if (res.ok) {
        setMarkers(data.markers ?? {});
      }
    } catch {
      setMarkers({});
    } finally {
      setLoadingMarkers(false);
    }
  }, [getIdToken, monthKey]);

  useEffect(() => {
    if (!open) return;
    void loadMarkers();
  }, [open, loadMarkers, refreshKey]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function openPicker() {
    setViewYear(parsed.year);
    setViewMonth(parsed.month);
    setOpen(true);
  }

  function selectDay(iso: string) {
    onChange(iso);
    setOpen(false);
  }

  function goToday() {
    const iso = todayISO();
    const next = parseISODate(iso)!;
    setViewYear(next.year);
    setViewMonth(next.month);
    selectDay(iso);
  }

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => (open ? setOpen(false) : openPicker())}
        className={cn(
          "inline-flex h-10 min-w-[11.5rem] items-center gap-2 rounded-xl border border-outline-variant",
          "bg-surface-container px-3 text-sm font-medium text-on-surface shadow-surface-input",
          "transition-colors hover:border-primary/40 hover:bg-surface-container-high",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
          open && "border-primary/50 ring-2 ring-primary/20",
        )}
      >
        <CalendarDays className="h-4 w-4 text-primary" strokeWidth={2} aria-hidden />
        <span className="capitalize">{TRIGGER_FORMATTER.format(new Date(`${value}T12:00:00`))}</span>
      </button>

      {open && (
        <div
          id={listboxId}
          role="dialog"
          aria-label="Escolher data"
          className={cn(surfaceDropdown, "absolute right-0 z-40 mt-2 w-[19.5rem] origin-top-right p-3")}
        >
          <div className="mb-3 flex items-center justify-between gap-2 px-1">
            <button
              type="button"
              aria-label="Mês anterior"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
              onClick={() => {
                const next = shiftMonth(viewYear, viewMonth, -1);
                setViewYear(next.year);
                setViewMonth(next.month);
              }}
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={2} />
            </button>
            <p className="font-heading text-sm font-semibold capitalize text-on-surface">
              {monthLabel}
            </p>
            <button
              type="button"
              aria-label="Próximo mês"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
              onClick={() => {
                const next = shiftMonth(viewYear, viewMonth, 1);
                setViewYear(next.year);
                setViewMonth(next.month);
              }}
            >
              <ChevronRight className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7 gap-1 px-0.5">
            {WEEKDAYS.map((label, index) => (
              <span
                key={`${label}-${index}`}
                className="py-1 text-center text-[0.65rem] font-semibold uppercase tracking-wide text-on-surface-variant/80"
              >
                {label}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((cell) => {
              const selected = cell.iso === value;
              const isToday = cell.iso === today;
              const count = markers[cell.iso] ?? 0;
              const hasBooking = count > 0;

              return (
                <button
                  key={cell.iso}
                  type="button"
                  onClick={() => selectDay(cell.iso)}
                  aria-label={
                    hasBooking
                      ? `${cell.iso}, ${count} reserva${count > 1 ? "s" : ""}`
                      : cell.iso
                  }
                  aria-pressed={selected}
                  className={cn(
                    "relative flex h-10 flex-col items-center justify-center rounded-xl text-sm transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
                    !cell.inMonth && "text-on-surface-variant/35",
                    cell.inMonth && !selected && "text-on-surface hover:bg-primary/10",
                    selected && "bg-primary font-semibold text-on-primary shadow-sm",
                    !selected && isToday && "ring-1 ring-primary/45",
                    !selected && hasBooking && cell.inMonth && "bg-primary/10",
                  )}
                >
                  <span className="leading-none tabular-nums">{cell.day}</span>
                  {hasBooking && (
                    <span
                      className={cn(
                        "mt-1 h-1.5 w-1.5 rounded-full",
                        selected ? "bg-on-primary" : "bg-primary",
                      )}
                      aria-hidden
                    />
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between gap-2 border-t border-outline-variant/50 px-1 pt-3">
            <p className="flex items-center gap-1.5 text-[0.7rem] text-on-surface-variant">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
              Dia com reserva
              {loadingMarkers ? "…" : ""}
            </p>
            <button
              type="button"
              onClick={goToday}
              className="rounded-lg px-2 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
            >
              Hoje
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
