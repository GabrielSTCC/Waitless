import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  PROTECTION_ADVISORY_DISMISS_KEY,
  dismissProtectionAdvisory,
  isAdminProtectedPath,
  isProtectionAdvisoryDismissed,
  shouldShowProtectionAdvisory,
} from "@/lib/admin/protection-advisory";

describe("protection-advisory paths and visibility", () => {
  it("isAdminProtectedPath inclui /admin e exclui auth/login", () => {
    expect(isAdminProtectedPath("/admin")).toBe(true);
    expect(isAdminProtectedPath("/admin/queue")).toBe(true);
    expect(isAdminProtectedPath("/admin/login")).toBe(false);
    expect(isAdminProtectedPath("/admin/onboarding")).toBe(false);
    expect(isAdminProtectedPath("/q/token")).toBe(false);
  });

  it("shouldShowProtectionAdvisory oculta em localhost", () => {
    expect(shouldShowProtectionAdvisory("localhost")).toBe(false);
    expect(shouldShowProtectionAdvisory("127.0.0.1")).toBe(false);
    expect(shouldShowProtectionAdvisory("waitless.solutions")).toBe(true);
  });

  it("shouldShowProtectionAdvisory respeita flag de dev", () => {
    expect(shouldShowProtectionAdvisory("localhost", true)).toBe(true);
  });
});

describe("protection-advisory dismiss", () => {
  const storage = new Map<string, string>();

  beforeEach(() => {
    storage.clear();
    vi.stubGlobal("sessionStorage", {
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

  it("dismiss persiste na sessão", () => {
    expect(isProtectionAdvisoryDismissed()).toBe(false);
    dismissProtectionAdvisory();
    expect(isProtectionAdvisoryDismissed()).toBe(true);
    expect(storage.get(PROTECTION_ADVISORY_DISMISS_KEY)).toBe("1");
  });
});
