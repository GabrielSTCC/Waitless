import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, isCredentialError } from "@/lib/firebase/admin";
import { getStripe } from "@/lib/billing/stripe-server";
import { syncCompanySubscriptionFromStripe } from "@/lib/billing/stripe-sync";
import { isNextResponse, verifyPlatformRequest } from "@/lib/platform/api-auth";
import { writePlatformAudit } from "@/lib/platform/audit";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  const authResult = await verifyPlatformRequest(request);
  if (isNextResponse(authResult)) return authResult;

  try {
    const { id } = await context.params;
    const db = getAdminDb();
    const companySnap = await db.doc(`companies/${id}`).get();

    if (!companySnap.exists) {
      return NextResponse.json({ error: "Empresa não encontrada." }, { status: 404 });
    }

    const companyData = companySnap.data()!;
    const companyName = companyData.name as string;
    const stripeSubscriptionId = companyData.subscription?.stripeSubscriptionId as
      | string
      | undefined;

    if (!stripeSubscriptionId) {
      return NextResponse.json(
        { error: "Empresa sem assinatura Stripe vinculada." },
        { status: 400 },
      );
    }

    const stripe = getStripe();
    const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
    await syncCompanySubscriptionFromStripe(db, id, subscription);

    await writePlatformAudit(db, {
      action: "company.sync_stripe",
      targetCompanyId: id,
      targetCompanyName: companyName,
      actorUid: authResult.uid,
      actorEmail: authResult.email,
      metadata: { stripeSubscriptionId },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isCredentialError(error)) {
      return NextResponse.json({ error: "Credenciais Firebase indisponíveis." }, { status: 503 });
    }
    console.error("[platform/companies/[id]/sync-stripe]", error);
    const message =
      error instanceof Error ? error.message : "Erro ao sincronizar Stripe.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
