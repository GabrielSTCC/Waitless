import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AREA_GUIDE_AUTO_PREFIX,
  AREA_GUIDE_SEEN_PREFIX,
  enableAreaGuideAuto,
  isAreaGuideAutoEnabled,
  isAreaGuideSeen,
  markAreaGuideSeen,
  resolveAreaId,
  shouldAutoOpenAreaGuide,
} from "@/lib/admin/area-guide";

describe("resolveAreaId", () => {
  it("mapeia rotas do painel para areaId", () => {
    expect(resolveAreaId("/admin")).toBe("queue");
    expect(resolveAreaId("/admin/")).toBe("queue");
    expect(resolveAreaId("/admin/appointments")).toBe("appointments");
    expect(resolveAreaId("/admin/customers")).toBe("customers");
    expect(resolveAreaId("/admin/analytics")).toBe("analytics");
    expect(resolveAreaId("/admin/settings")).toBe("settings");
    expect(resolveAreaId("/admin/accessibility")).toBe("accessibility");
    expect(resolveAreaId("/admin/security")).toBe("security");
    expect(resolveAreaId("/admin/account")).toBe("account");
  });

  it("retorna null fora de rotas com guia", () => {
    expect(resolveAreaId("/admin/help")).toBe(null);
    expect(resolveAreaId("/admin/login")).toBe(null);
    expect(resolveAreaId("/admin/onboarding")).toBe(null);
    expect(resolveAreaId("/admin/invite/abc")).toBe(null);
    expect(resolveAreaId("/q/token")).toBe(null);
  });
});

describe("area-guide storage", () => {
  const storage = new Map<string, string>();

  beforeEach(() => {
    storage.clear();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
      clear: () => {
        storage.clear();
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("ativa cohort de auto-open por uid", () => {
    expect(isAreaGuideAutoEnabled("u1")).toBe(false);
    enableAreaGuideAuto("u1");
    expect(isAreaGuideAutoEnabled("u1")).toBe(true);
    expect(storage.get(`${AREA_GUIDE_AUTO_PREFIX}u1`)).toBe("1");
    expect(isAreaGuideAutoEnabled("u2")).toBe(false);
  });

  it("marca área como vista e bloqueia auto-open", () => {
    enableAreaGuideAuto("u1");
    expect(shouldAutoOpenAreaGuide("u1", "queue")).toBe(true);
    markAreaGuideSeen("u1", "queue");
    expect(isAreaGuideSeen("u1", "queue")).toBe(true);
    expect(shouldAutoOpenAreaGuide("u1", "queue")).toBe(false);
    expect(shouldAutoOpenAreaGuide("u1", "appointments")).toBe(true);
    expect(storage.get(`${AREA_GUIDE_SEEN_PREFIX}u1:queue`)).toBe("1");
  });

  it("sem cohort não auto-abre mesmo sem seen", () => {
    expect(shouldAutoOpenAreaGuide("u1", "queue")).toBe(false);
  });
});
