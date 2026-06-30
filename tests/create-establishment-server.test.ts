import { describe, expect, it } from "vitest";
import { slugFromCompanyName, validateCompanySlug } from "@/lib/utils/company-slug";
import { CreateEstablishmentError } from "@/lib/auth/create-establishment-server";

describe("create-establishment-server", () => {
  it("maps name_taken to company slug api code", () => {
    const error = new CreateEstablishmentError(
      "name_taken",
      "Já existe um estabelecimento com este nome. Escolha outro.",
      "barbearia",
    );
    expect(error.apiCode).toBe("company/name-already-in-use");
    expect(error.slug).toBe("barbearia");
  });

  it("derives slug from company name for onboarding", () => {
    expect(slugFromCompanyName("Barbearia")).toBe("barbearia");
    expect(() => validateCompanySlug(slugFromCompanyName("Barbearia"))).not.toThrow();
  });

  it("rejects too-short company names", () => {
    expect(() => validateCompanySlug(slugFromCompanyName("A"))).toThrow();
  });
});
