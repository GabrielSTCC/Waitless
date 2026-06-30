import { NextRequest, NextResponse } from "next/server";
import { getAsaasPayment } from "@/lib/billing/asaas/client";
import { syncCompanySubscriptionFromAsaasPayment } from "@/lib/billing/asaas/sync";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { getAdminDb } from "@/lib/firebase/admin";

export async function GET(request: NextRequest) {
  const authResult = await authenticateRequest(request);
  if (authResult instanceof Response) return authResult;

  const paymentId = request.nextUrl.searchParams.get("paymentId")?.trim();
  if (!paymentId) {
    return NextResponse.json({ error: "paymentId obrigatório." }, { status: 400 });
  }

  try {
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
    const subscription = companySnap.data()?.subscription as
      | { pixPendingPaymentId?: string; asaasSubscriptionId?: string }
      | undefined;

    if (
      subscription?.pixPendingPaymentId !== paymentId &&
      !subscription?.asaasSubscriptionId
    ) {
      return NextResponse.json({ error: "Cobrança não pertence a esta conta." }, { status: 403 });
    }

    const payment = await getAsaasPayment(paymentId);
    await syncCompanySubscriptionFromAsaasPayment(db, payment);

    const updated = await db.doc(`companies/${companyId}`).get();
    const status = updated.data()?.subscription?.status ?? "none";

    return NextResponse.json({
      status,
      paymentStatus: payment.status,
      active: status === "active",
    });
  } catch (error) {
    console.error("[billing/pix/status]", error);
    const message = error instanceof Error ? error.message : "Falha ao consultar PIX.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
