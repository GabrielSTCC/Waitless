import { NextRequest, NextResponse } from "next/server";
import {
  AsaasApiError,
  getAsaasPayment,
  getAsaasPixQrCode,
  simulateAsaasPixQrCodePayment,
} from "@/lib/billing/asaas/client";
import { isAsaasPixEnabled, isAsaasSandbox } from "@/lib/billing/asaas/config";
import { syncCompanySubscriptionFromAsaasPayment } from "@/lib/billing/asaas/sync";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { getAdminDb } from "@/lib/firebase/admin";

export async function POST(request: NextRequest) {
  if (!isAsaasPixEnabled() || !isAsaasSandbox()) {
    return NextResponse.json(
      { error: "Simulação disponível apenas com ASAAS_SANDBOX=true." },
      { status: 403 },
    );
  }

  const authResult = await authenticateRequest(request);
  if (authResult instanceof Response) return authResult;

  const body = (await request.json().catch(() => null)) as { paymentId?: string } | null;
  const paymentId = body?.paymentId?.trim();
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
      | { pixPendingPaymentId?: string }
      | undefined;

    if (subscription?.pixPendingPaymentId !== paymentId) {
      return NextResponse.json({ error: "Cobrança não pertence a esta conta." }, { status: 403 });
    }

    const payment = await getAsaasPayment(paymentId);
    const pix = await getAsaasPixQrCode(paymentId);

    await simulateAsaasPixQrCodePayment(pix.payload, payment.value);

    const updatedPayment = await getAsaasPayment(paymentId);
    await syncCompanySubscriptionFromAsaasPayment(db, updatedPayment);

    return NextResponse.json({ ok: true, paymentStatus: updatedPayment.status });
  } catch (error) {
    console.error("[billing/pix/simulate]", error);
    if (error instanceof AsaasApiError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    const message = error instanceof Error ? error.message : "Falha ao simular pagamento.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
