import { describe, expect, it } from "vitest";
import { appointmentEtaMin, defaultBusinessHours, listOpenSlots } from "@/lib/appointments/hours";

describe("agendamento", () => {
  it("ignora um horario ja ocupado", () => {
    const hours = defaultBusinessHours();
    const open = listOpenSlots({
      dateISO: "2026-09-28",
      hours,
      durationMin: 60,
      takenAt: [],
      now: new Date("2026-09-28T00:00:00.000Z"),
    });
    expect(open.length).toBeGreaterThan(0);
    const first = open[0]?.getTime() ?? 0;
    const blocked = listOpenSlots({
      dateISO: "2026-09-28",
      hours,
      durationMin: 60,
      takenAt: [first],
      now: new Date("2026-09-28T00:00:00.000Z"),
    });
    expect(blocked.find((slot) => slot.getTime() === first)).toBeUndefined();
  });

  it("estima pelo maior entre o horario e a fila", () => {
    const scheduledAt = new Date(Date.now() + 40 * 60_000);
    const eta = appointmentEtaMin({
      scheduledAt,
      peopleAhead: 1,
      inServiceCount: 1,
      avgMin: 30,
      now: new Date(),
    });
    expect(eta).toBeGreaterThanOrEqual(60);
  });
});
