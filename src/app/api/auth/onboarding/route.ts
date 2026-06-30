import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import {
  CreateEstablishmentError,
  createEstablishmentServer,
} from "@/lib/auth/create-establishment-server";
import type { BillingCountry } from "@/lib/billing/resolve-market";
import {
  CREDENTIAL_SETUP_MESSAGE,
  getAdminDb,
  isCredentialError,
} from "@/lib/firebase/admin";

export const runtime = "nodejs";

function parseBillingCountry(value: unknown): BillingCountry {
  return value === "US" ? "US" : "BR";
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult instanceof Response) return authResult;

    const body = (await request.json().catch(() => ({}))) as {
      companyName?: unknown;
      billingCountry?: unknown;
    };

    const companyName =
      typeof body.companyName === "string" ? body.companyName.trim() : "";
    if (!companyName) {
      return NextResponse.json(
        { error: "Nome do estabelecimento é obrigatório." },
        { status: 400 },
      );
    }

    const email = authResult.email?.trim();
    if (!email) {
      return NextResponse.json(
        { error: "Conta sem e-mail vinculado." },
        { status: 400 },
      );
    }

    const result = await createEstablishmentServer(
      getAdminDb(),
      authResult.uid,
      email,
      companyName,
      parseBillingCountry(body.billingCountry),
    );

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof CreateEstablishmentError) {
      const status =
        error.code === "name_taken" || error.code === "already_member" ? 409 : 400;
      return NextResponse.json(
        {
          error: error.message,
          code: error.apiCode,
          slug: error.slug,
          ...(error.existingMember ? { member: error.existingMember } : {}),
        },
        { status },
      );
    }

    if (isCredentialError(error)) {
      return NextResponse.json({ error: CREDENTIAL_SETUP_MESSAGE }, { status: 503 });
    }

    console.error("[auth/onboarding]", error);
    return NextResponse.json(
      { error: "Erro ao criar estabelecimento." },
      { status: 500 },
    );
  }
}
