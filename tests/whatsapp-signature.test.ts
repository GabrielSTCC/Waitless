import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyWhatsAppSignature } from "@/lib/whatsapp/verify-signature";

describe("verifyWhatsAppSignature", () => {
  const secret = "test-app-secret";
  const body = '{"object":"whatsapp_business_account"}';

  it("aceita assinatura válida", () => {
    const digest = createHmac("sha256", secret).update(body, "utf8").digest("hex");
    expect(verifyWhatsAppSignature(body, `sha256=${digest}`, secret)).toBe(true);
  });

  it("rejeita assinatura inválida ou ausente", () => {
    expect(verifyWhatsAppSignature(body, null, secret)).toBe(false);
    expect(verifyWhatsAppSignature(body, "sha256=deadbeef", secret)).toBe(false);
    expect(verifyWhatsAppSignature(body, `sha256=${"a".repeat(64)}`, secret)).toBe(
      false,
    );
    expect(verifyWhatsAppSignature(body, `sha256=${"a".repeat(64)}`, "")).toBe(false);
  });
});
