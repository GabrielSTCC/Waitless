import { describe, expect, it } from "vitest";
import { isMfaExemptPath } from "@/lib/auth/mfa-exempt";

describe("isMfaExemptPath", () => {
  it("isenta bootstrap 2FA e sessão", () => {
    expect(isMfaExemptPath("/api/auth/2fa/evaluate")).toBe(true);
    expect(isMfaExemptPath("/api/auth/2fa/verify")).toBe(true);
    expect(isMfaExemptPath("/api/auth/session")).toBe(true);
    expect(isMfaExemptPath("/api/auth/onboarding")).toBe(true);
  });

  it("exige MFA em rotas tenant", () => {
    expect(isMfaExemptPath("/api/admin/queue")).toBe(false);
    expect(isMfaExemptPath("/api/whatsapp/send")).toBe(false);
    expect(isMfaExemptPath("/api/company/settings")).toBe(false);
  });
});
