import { describe, expect, it } from "vitest";
import {
  assertClientPasswordValid,
  hashClientPassword,
  verifyClientPassword,
} from "@/lib/appointments/client-password";
import { CLIENT_PASSWORD_MIN_LENGTH } from "@/lib/appointments/client-password-policy";
import {
  buildAppointmentBookingUrl,
  buildAppointmentPublicBookingMessage,
} from "@/lib/utils/app-url";

describe("client-password", () => {
  it("rejeita senha curta", () => {
    expect(() => assertClientPasswordValid("12345")).toThrow();
  });

  it("hash e verify round-trip", async () => {
    const hash = await hashClientPassword("segredo1");
    expect(hash.startsWith("scrypt$")).toBe(true);
    expect(await verifyClientPassword("segredo1", hash)).toBe(true);
    expect(await verifyClientPassword("outra", hash)).toBe(false);
  });

  it("exporta mínimo alinhado à policy", () => {
    expect(CLIENT_PASSWORD_MIN_LENGTH).toBe(6);
  });
});

describe("appointment booking url", () => {
  it("monta /agendar/{companyId} com base pública", () => {
    const url = buildAppointmentBookingUrl("abc", "https://waitless.solutions");
    expect(url.endsWith("/agendar/abc")).toBe(true);
    expect(url.includes("://")).toBe(true);
  });

  it("mensagem pública inclui o link de agendar", () => {
    const msg = buildAppointmentPublicBookingMessage(
      "Barbearia",
      "abc",
      "https://waitless.solutions",
    );
    expect(msg).toContain("Barbearia");
    expect(msg).toContain("/agendar/abc");
  });
});
