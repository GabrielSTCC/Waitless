import { describe, expect, it } from "vitest";
import { buildPublicQueueCompanyFields } from "@/lib/queue/public-queue-company-fields";
import type { Company } from "@/lib/types";

const baseCompany: Company = {
  id: "barbearia",
  name: "Barbearia",
  ownerId: "owner-1",
  avgServiceTimeMin: 10,
  toleranceEnabled: false,
  toleranceMin: 5,
  defaultLocale: "pt-BR",
  brand: {
    accentColor: "#680828",
    logoUrl: "https://example.com/logo.webp",
    tagline: "Aguardando com carinho",
  },
  contactWhatsapp: "11999990000",
  createdAt: new Date(),
};

describe("buildPublicQueueCompanyFields", () => {
  it("maps company branding to publicQueue fields", () => {
    const fields = buildPublicQueueCompanyFields(baseCompany, 2);

    expect(fields.companyName).toBe("Barbearia");
    expect(fields.brandAccent).toBe("#680828");
    expect(fields.brandLogoUrl).toBe("https://example.com/logo.webp");
    expect(fields.companyTagline).toBe("Aguardando com carinho");
    expect(fields.estimatedWaitMin).toBe(10);
  });

  it("omits estimatedWaitMin when position is not provided", () => {
    const fields = buildPublicQueueCompanyFields(baseCompany);
    expect(fields.estimatedWaitMin).toBeUndefined();
  });
});
