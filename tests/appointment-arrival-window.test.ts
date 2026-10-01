import { describe, expect, it } from "vitest";
import {
  evaluateArrivalWindow,
  isSameZoneDay,
} from "@/lib/appointments/arrival-window";
import {
  defaultBusinessHours,
  effectiveHoursForDate,
  listOpenSlots,
} from "@/lib/appointments/hours";

describe("arrival window", () => {
  const baseConfig = {
    arrivalConfirmRequired: true,
    arrivalConfirmOpenMin: 120,
    arrivalConfirmDeadlineMin: 0,
    autoJoinLeadMin: 0,
  };

  it("bloqueia confirmação fora do dia", () => {
    const scheduledAt = new Date("2026-10-05T18:00:00.000Z");
    const now = new Date("2026-10-04T18:00:00.000Z");
    expect(evaluateArrivalWindow(scheduledAt, baseConfig, now)).toBe("not_today");
  });

  it("abre confirmação 2h antes no mesmo dia", () => {
    const scheduledAt = new Date("2026-10-05T18:00:00.000Z");
    const tooEarly = new Date(scheduledAt.getTime() - 180 * 60_000);
    const open = new Date(scheduledAt.getTime() - 60 * 60_000);
    expect(isSameZoneDay(scheduledAt, open)).toBe(true);
    expect(evaluateArrivalWindow(scheduledAt, baseConfig, tooEarly)).toBe("too_early");
    expect(evaluateArrivalWindow(scheduledAt, baseConfig, open)).toBe("open");
  });

  it("marca deadline e auto-join", () => {
    const scheduledAt = new Date("2026-10-05T18:00:00.000Z");
    const after = new Date(scheduledAt.getTime() + 60_000);
    expect(
      evaluateArrivalWindow(
        scheduledAt,
        { ...baseConfig, arrivalConfirmDeadlineMin: 0 },
        after,
      ),
    ).toBe("deadline_passed");
    expect(
      evaluateArrivalWindow(
        scheduledAt,
        {
          arrivalConfirmRequired: false,
          arrivalConfirmOpenMin: 120,
          arrivalConfirmDeadlineMin: 0,
          autoJoinLeadMin: 15,
        },
        new Date(scheduledAt.getTime() - 10 * 60_000),
      ),
    ).toBe("auto_join");
  });
});

describe("calendar exceptions", () => {
  it("fecha o dia e aplica override", () => {
    const hours = defaultBusinessHours();
    expect(
      effectiveHoursForDate("2026-10-05", hours, { type: "closed" })?.closed,
    ).toBe(true);
    const override = effectiveHoursForDate("2026-10-05", hours, {
      type: "hours_override",
      start: "10:00",
      end: "12:00",
    });
    expect(override?.closed).toBe(false);
    expect(override?.start).toBe("10:00");
    expect(override?.end).toBe("12:00");
  });

  it("não lista slots em dia fechado por exceção", () => {
    const slots = listOpenSlots({
      dateISO: "2026-10-05",
      hours: defaultBusinessHours(),
      durationMin: 30,
      takenAt: [],
      now: new Date("2026-10-04T12:00:00.000Z"),
      exception: { type: "closed" },
    });
    expect(slots).toEqual([]);
  });
});
