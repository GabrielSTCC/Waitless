import { describe, expect, it } from "vitest";
import {
  dateISOInZone,
  evaluateArrivalWindow,
  isSameZoneDay,
} from "@/lib/appointments/arrival-window";

describe("arrival-window", () => {
  it("marca not_today quando o horário é em outro dia civil", () => {
    // 2026-10-02 15:00 America/Sao_Paulo = 18:00 UTC
    const scheduledAt = new Date("2026-10-02T18:00:00.000Z");
    // 2026-10-01 12:00 America/Sao_Paulo = 15:00 UTC
    const now = new Date("2026-10-01T15:00:00.000Z");
    expect(evaluateArrivalWindow(scheduledAt, now)).toBe("not_today");
    expect(isSameZoneDay(scheduledAt, now)).toBe(false);
  });

  it("marca open no mesmo dia antes do horário", () => {
    const scheduledAt = new Date("2026-10-02T18:00:00.000Z");
    // 2026-10-02 09:00 America/Sao_Paulo = 12:00 UTC
    const now = new Date("2026-10-02T12:00:00.000Z");
    expect(dateISOInZone(scheduledAt)).toBe("2026-10-02");
    expect(dateISOInZone(now)).toBe("2026-10-02");
    expect(evaluateArrivalWindow(scheduledAt, now)).toBe("open");
  });

  it("marca open exatamente no horário marcado", () => {
    const scheduledAt = new Date("2026-10-02T18:00:00.000Z");
    expect(evaluateArrivalWindow(scheduledAt, scheduledAt)).toBe("open");
  });

  it("marca deadline_passed no mesmo dia após o horário", () => {
    const scheduledAt = new Date("2026-10-02T18:00:00.000Z");
    // 2026-10-02 16:00 America/Sao_Paulo = 19:00 UTC
    const now = new Date("2026-10-02T19:00:00.000Z");
    expect(evaluateArrivalWindow(scheduledAt, now)).toBe("deadline_passed");
  });
});
