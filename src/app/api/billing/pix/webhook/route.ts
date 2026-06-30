import { NextRequest, NextResponse } from "next/server";
import { syncCompanySubscriptionFromAsaasWebhook } from "@/lib/billing/asaas/sync";
import { getAdminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";

const HANDLED_EVENTS = new Set([
  "PAYMENT_RECEIVED",
  "PAYMENT_CONFIRMED",
  "PAYMENT_OVERDUE",
  "PAYMENT_REFUNDED",
  "PAYMENT_DELETED",
]);

export async function POST(request: NextRequest) {
  const webhookToken = process.env.ASAAS_WEBHOOK_TOKEN?.trim();
  if (!webhookToken) {
    return NextResponse.json({ error: "Webhook PIX não configurado." }, { status: 503 });
  }

  const receivedToken = request.headers.get("asaas-access-token");
  if (!receivedToken || receivedToken !== webhookToken) {
    return NextResponse.json({ error: "Token inválido." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    event?: string;
    payment?: { id?: string; externalReference?: string };
  } | null;

  if (!body?.event || !HANDLED_EVENTS.has(body.event)) {
    return NextResponse.json({ received: true });
  }

  const paymentId = body.payment?.id;
  if (!paymentId) {
    return NextResponse.json({ received: true });
  }

  try {
    const db = getAdminDb();
    await syncCompanySubscriptionFromAsaasWebhook(
      db,
      paymentId,
      body.payment?.externalReference,
    );
  } catch (error) {
    console.error("[billing/pix/webhook]", error);
    const message = error instanceof Error ? error.message : "Falha no webhook PIX.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
