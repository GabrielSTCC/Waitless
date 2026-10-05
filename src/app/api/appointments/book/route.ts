import { NextRequest, NextResponse } from "next/server";
import { bookAppointment } from "@/lib/appointments/appointment-server";
import {
  checkRateLimit,
  getRequestIp,
  rateLimitResponse,
} from "@/lib/rate-limit/check-rate-limit";
import { reportError } from "@/lib/observability/report-error";
import { recordTenantEvent } from "@/lib/observability/tenant-log";
import { getAdminDb, isCredentialError, CREDENTIAL_SETUP_MESSAGE } from "@/lib/firebase/admin";
import { normalizeWhatsapp } from "@/lib/utils/format";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let companyId = "";
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    companyId = typeof body.companyId === "string" ? body.companyId.trim() : "";
    const name = typeof body.name === "string" ? body.name : "";
    const whatsapp = typeof body.whatsapp === "string" ? body.whatsapp : "";
    const scheduledAt = typeof body.scheduledAt === "string" ? body.scheduledAt : "";
    const professionalId =
      typeof body.professionalId === "string" ? body.professionalId : undefined;
    const password = typeof body.password === "string" ? body.password : undefined;
    const newPassword = typeof body.newPassword === "string" ? body.newPassword : undefined;
    if (!companyId) {
      return NextResponse.json({ error: "Estabelecimento obrigatório." }, { status: 400 });
    }

    const ip = getRequestIp(request);
    const digits = normalizeWhatsapp(whatsapp);
    const limited = await checkRateLimit(
      `appt-book:${ip}:${companyId}:${digits.slice(-6)}`,
      15,
      60_000,
    );
    if (!limited.ok) {
      void recordTenantEvent({
        companyId,
        route: "/api/appointments/book",
        level: "warn",
        kind: "rate_limit",
        message: "Rate limit no agendamento público",
        statusCode: 429,
      });
      const { body: errBody, init } = rateLimitResponse(limited);
      return NextResponse.json(errBody, init);
    }

    const result = await bookAppointment(getAdminDb(), {
      companyId,
      name,
      whatsapp,
      scheduledAtIso: scheduledAt,
      professionalId,
      password,
      newPassword,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (isCredentialError(error)) {
      return NextResponse.json({ error: CREDENTIAL_SETUP_MESSAGE }, { status: 503 });
    }
    const message = error instanceof Error ? error.message : "Não foi possível agendar.";
    void reportError(error, { route: "/api/appointments/book", companyId });
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
