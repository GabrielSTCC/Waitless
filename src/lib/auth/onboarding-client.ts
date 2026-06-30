import type { BillingCountry } from "@/lib/billing/resolve-market";
import { auth } from "@/lib/firebase/config";
import { reviveCompany } from "@/lib/auth/session-client";
import type { Company, Member, MemberRole } from "@/lib/types";
import {
  CompanyNameTakenError,
  InvalidCompanyNameError,
} from "@/lib/utils/company-slug";

export interface OnboardingResult {
  companyId: string;
  member: Member;
  company: Company | null;
  alreadyRegistered: boolean;
}

function mapApiMember(data: {
  companyId: string;
  email: string;
  role: string;
}): Member {
  return {
    companyId: data.companyId,
    email: data.email,
    role: data.role as MemberRole,
  };
}

export async function createEstablishmentViaApi(
  companyName: string,
  billingCountry: BillingCountry = "BR",
): Promise<OnboardingResult> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Não autenticado.");
  }

  const idToken = await user.getIdToken();
  const response = await fetch("/api/auth/onboarding", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ companyName, billingCountry }),
  });

  const data = (await response.json().catch(() => ({}))) as {
    companyId?: string;
    member?: { companyId: string; email: string; role: string };
    company?: Record<string, unknown>;
    error?: string;
    code?: string;
    slug?: string;
  };

  if (data.code === "company/already-member" && data.member) {
    return {
      companyId: data.member.companyId,
      member: mapApiMember(data.member),
      company: data.company ? reviveCompany(data.company) : null,
      alreadyRegistered: true,
    };
  }

  if (!response.ok || !data.companyId || !data.member) {
    if (response.status === 503) {
      throw new Error(
        data.error ??
          "Serviço temporariamente indisponível. Tente novamente em instantes.",
      );
    }
    if (data.code === "company/name-already-in-use") {
      throw new CompanyNameTakenError(data.slug ?? "");
    }
    if (data.code === "company/invalid-name") {
      throw new InvalidCompanyNameError(
        data.error ?? "Nome do estabelecimento inválido.",
      );
    }
    throw new Error(data.error ?? "Falha ao criar estabelecimento.");
  }

  return {
    companyId: data.companyId,
    member: mapApiMember(data.member),
    company: data.company ? reviveCompany(data.company) : null,
    alreadyRegistered: false,
  };
}
