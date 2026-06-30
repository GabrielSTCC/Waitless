import { NextRequest, NextResponse } from "next/server";
import { isStripeConfigured } from "@/lib/billing/stripe-prices";
import { getAppBaseUrl, getStripe } from "@/lib/billing/stripe-server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { getAdminDb } from "@/lib/firebase/admin";

export async function POST(request: NextRequest) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Pagamentos ainda não configurados no servidor." },
      { status: 503 },
    );
  }

  const authResult = await authenticateRequest(request);
  if (authResult instanceof Response) return authResult;

  const db = getAdminDb();
  const memberSnap = await db.doc(`members/${authResult.uid}`).get();
  if (!memberSnap.exists) {
    return NextResponse.json({ error: "Membro não encontrado." }, { status: 403 });
  }

  const companyId = memberSnap.data()?.companyId as string | undefined;
  if (!companyId) {
    return NextResponse.json({ error: "Empresa não vinculada." }, { status: 403 });
  }

  const companySnap = await db.doc(`companies/${companyId}`).get();
  if (!companySnap.exists) {
    return NextResponse.json({ error: "Empresa não encontrada." }, { status: 404 });
  }

  const companyData = companySnap.data()!;
  if (companyData.ownerId !== authResult.uid) {
    return NextResponse.json(
      { error: "Somente o dono pode gerenciar a assinatura." },
      { status: 403 },
    );
  }

  const customerId = (
    companyData.subscription as { stripeCustomerId?: string } | undefined
  )?.stripeCustomerId;

  if (!customerId) {
    return NextResponse.json(
      { error: "Nenhuma assinatura vinculada ainda." },
      { status: 400 },
    );
  }

  const stripe = getStripe();
  const baseUrl = getAppBaseUrl();
  const portal = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${baseUrl}/admin/account`,
  });

  return NextResponse.json({ url: portal.url });
}
