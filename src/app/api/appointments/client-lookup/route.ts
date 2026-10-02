import { NextRequest, NextResponse } from "next/server";
import { lookupClientForBooking } from "@/lib/appointments/appointment-server";
import {
  checkSimpleRateLimit,
  getRequestIp,
} from "@/lib/appointments/public-rate-limit";
import { getAdminDb, isCredentialError, CREDENTIAL_SETUP_MESSAGE } from "@/lib/firebase/admin";
import { normalizeWhatsapp } from "@/lib/utils/format";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const companyId = typeof body.companyId === "string" ? body.companyId.trim() : "";
    const whatsapp = typeof body.whatsapp === "string" ? body.whatsapp : "";
    if (!companyId) {
      return NextResponse.json({ error: "Estabelecimento obrigatório." }, { status: 400 });
    }

    const ip = getRequestIp(request);
    const digits = normalizeWhatsapp(whatsapp);
    const limited = checkSimpleRateLimit(
      `appt-lookup:${ip}:${companyId}:${digits.slice(-6)}`,
      30,
      60_000,
    );
    if (!limited.ok) {
      return NextResponse.json(
        { error: "Muitas tentativas. Aguarde um momento." },
        { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } },
      );
    }

    const result = await lookupClientForBooking(getAdminDb(), companyId, whatsapp);
    return NextResponse.json(result);
  } catch (error) {
    if (isCredentialError(error)) {
      return NextResponse.json({ error: CREDENTIAL_SETUP_MESSAGE }, { status: 503 });
    }
    const message = error instanceof Error ? error.message : "Não foi possível consultar.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
