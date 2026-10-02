import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  checkSimpleRateLimit,
  getRequestIp,
} from "@/lib/rate-limit/check-rate-limit";

describe("checkSimpleRateLimit (memory)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-02T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("permite até o limite e depois bloqueia", () => {
    const key = `test-${Math.random()}`;
    expect(checkSimpleRateLimit(key, 2, 60_000).ok).toBe(true);
    expect(checkSimpleRateLimit(key, 2, 60_000).ok).toBe(true);
    const blocked = checkSimpleRateLimit(key, 2, 60_000);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });

  it("reinicia após a janela", () => {
    const key = `test-window-${Math.random()}`;
    expect(checkSimpleRateLimit(key, 1, 1_000).ok).toBe(true);
    expect(checkSimpleRateLimit(key, 1, 1_000).ok).toBe(false);
    vi.advanceTimersByTime(1_001);
    expect(checkSimpleRateLimit(key, 1, 1_000).ok).toBe(true);
  });
});

describe("getRequestIp", () => {
  it("usa x-forwarded-for", () => {
    const req = new Request("https://example.com", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });
    expect(getRequestIp(req)).toBe("1.2.3.4");
  });
});
