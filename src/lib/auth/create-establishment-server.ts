import { FieldValue, Timestamp, type Firestore } from "firebase-admin/firestore";
import {
  countryToBillingMarket,
  type BillingCountry,
} from "@/lib/billing/resolve-market";
import { computeTrialEndsAt } from "@/lib/billing/trial";
import type { MemberRole, Company } from "@/lib/types";
import {
  InvalidCompanyNameError,
  slugFromCompanyName,
  validateCompanySlug,
} from "@/lib/utils/company-slug";

export interface EstablishmentMember {
  companyId: string;
  email: string;
  role: MemberRole;
}

export interface EstablishmentResult {
  companyId: string;
  member: EstablishmentMember;
  company: Company;
}

export class CreateEstablishmentError extends Error {
  readonly apiCode: string;

  constructor(
    readonly code: "name_taken" | "already_member" | "invalid_name",
    message: string,
    readonly slug?: string,
    readonly existingMember?: EstablishmentMember,
  ) {
    super(message);
    this.name = "CreateEstablishmentError";
    this.apiCode =
      code === "name_taken"
        ? "company/name-already-in-use"
        : code === "invalid_name"
          ? "company/invalid-name"
          : "company/already-member";
  }
}

export async function createEstablishmentServer(
  db: Firestore,
  userId: string,
  email: string,
  companyName: string,
  billingCountry: BillingCountry = "BR",
): Promise<EstablishmentResult> {
  const trimmedName = companyName.trim();
  const companyId = slugFromCompanyName(trimmedName);

  try {
    validateCompanySlug(companyId);
  } catch (error) {
    if (error instanceof InvalidCompanyNameError) {
      throw new CreateEstablishmentError("invalid_name", error.message);
    }
    throw error;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const memberRef = db.doc(`members/${userId}`);
  const companyRef = db.doc(`companies/${companyId}`);
  const trialEndsAt = computeTrialEndsAt();

  await db.runTransaction(async (transaction) => {
    const memberSnap = await transaction.get(memberRef);
    if (memberSnap.exists) {
      const data = memberSnap.data()!;
      throw new CreateEstablishmentError(
        "already_member",
        "Esta conta já pertence a um estabelecimento.",
        undefined,
        {
          companyId: data.companyId as string,
          email: data.email as string,
          role: (data.role as MemberRole) ?? "owner",
        },
      );
    }

    const companySnap = await transaction.get(companyRef);
    if (companySnap.exists) {
      throw new CreateEstablishmentError(
        "name_taken",
        "Já existe um estabelecimento com este nome. Escolha outro.",
        companyId,
      );
    }

    transaction.set(companyRef, {
      name: trimmedName,
      ownerId: userId,
      avgServiceTimeMin: 10,
      toleranceEnabled: false,
      toleranceMin: 5,
      billingCountry,
      billingMarket: countryToBillingMarket(billingCountry),
      defaultLocale: billingCountry === "BR" ? "pt-BR" : "en",
      subscription: {
        status: "trialing",
        planId: "free",
        trialEndsAt: Timestamp.fromDate(trialEndsAt),
      },
      createdAt: FieldValue.serverTimestamp(),
    });

    transaction.set(memberRef, {
      companyId,
      email: normalizedEmail,
      role: "owner",
    });
  });

  return {
    companyId,
    member: {
      companyId,
      email: normalizedEmail,
      role: "owner",
    },
    company: {
      id: companyId,
      name: trimmedName,
      ownerId: userId,
      avgServiceTimeMin: 10,
      toleranceEnabled: false,
      toleranceMin: 5,
      billingCountry,
      billingMarket: countryToBillingMarket(billingCountry),
      defaultLocale: billingCountry === "BR" ? "pt-BR" : "en",
      subscription: {
        status: "trialing",
        planId: "free",
        trialEndsAt,
      },
      createdAt: new Date(),
    },
  };
}
