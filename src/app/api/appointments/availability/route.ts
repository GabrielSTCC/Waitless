import { NextRequest, NextResponse } from "next/server";
import { listAvailability } from "@/lib/appointments/appointment-server";
import {
  checkRateLimit,
  getRequestIp,
  rateLimitResponse,
} from "@/lib/rate-limit/check-rate-limit";
import { reportError } from "@/lib/observability/report-error";
import { getAdminDb, isCredentialError, CREDENTIAL_SETUP_MESSAGE } from "@/lib/firebase/admin";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let companyId = "";
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    companyId = typeof body.companyId === "string" ? body.companyId.trim() : "";
    const date = typeof body.date === "string" ? body.date : "";
    const professionalId =
      typeof body.professionalId === "string" ? body.professionalId : undefined;
    if (!companyId || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: "Informe o estabelecimento e a data." }, { status: 400 });
    }

    const ip = getRequestIp(request);
    const limited = await checkRateLimit(`appt-avail:${ip}:${companyId}`, 60, 60_000);
    if (!limited.ok) {
      const { body: errBody, init } = rateLimitResponse(limited);
      return NextResponse.json(errBody, init);
    }

    const result = await listAvailability(getAdminDb(), companyId, date, professionalId);
    return NextResponse.json(result);
  } catch (error) {
    if (isCredentialError(error)) {
      return NextResponse.json({ error: CREDENTIAL_SETUP_MESSAGE }, { status: 503 });
    }
    const message = error instanceof Error ? error.message : "Não foi possível ver os horários.";
    void reportError(error, { route: "/api/appointments/availability", companyId });
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
