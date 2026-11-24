import { NextRequest, NextResponse } from "next/server";
import { verifyWhatsAppSignature } from "@/lib/whatsapp/verify-signature";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(request: NextRequest) {
  const appSecret = process.env.WHATSAPP_APP_SECRET?.trim() ?? "";
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");
  // Sem secret ou assinatura inválida → 403 (não revelar se o secret está ausente).
  if (!appSecret || !verifyWhatsAppSignature(rawBody, signature, appSecret)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Stub: ACK após assinatura válida (processamento de eventos fica fora do Sprint A).
  try {
    JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  return NextResponse.json({ received: true });
}
