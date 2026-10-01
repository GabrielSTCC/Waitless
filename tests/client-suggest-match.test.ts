import { describe, expect, it } from "vitest";
import {
  nameIncludes,
  stripWhatsappCountry55,
  whatsappIncludes,
} from "@/lib/utils/format";

describe("client suggest matching", () => {
  it("casa WhatsApp com ou sem 55 e por trecho", () => {
    expect(stripWhatsappCountry55("558598889999")).toBe("8598889999");
    expect(whatsappIncludes("8598889999", "85")).toBe(true);
    expect(whatsappIncludes("558598889999", "85988")).toBe(true);
    expect(whatsappIncludes("8598889999", "5585988")).toBe(true);
    expect(whatsappIncludes("8598889999", "777")).toBe(false);
  });

  it("casa nome por substring ignorando maiúsculas", () => {
    expect(nameIncludes("Maria Silva", "sil")).toBe(true);
    expect(nameIncludes("Maria Silva", "MARIA")).toBe(true);
    expect(nameIncludes("Maria Silva", "jo")).toBe(false);
  });
});
