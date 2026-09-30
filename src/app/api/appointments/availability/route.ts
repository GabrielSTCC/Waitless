import { NextRequest, NextResponse } from "next/server";
import { listAvailability } from "@/lib/appointments/appointment-server";
import { getAdminDb, isCredentialError, CREDENTIAL_SETUP_MESSAGE } from "@/lib/firebase/admin";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const companyId = typeof body.companyId === "string" ? body.companyId.trim() : "";
    const date = typeof body.date === "string" ? body.date : "";
    const professionalId =
      typeof body.professionalId === "string" ? body.professionalId : undefined;
    if (!companyId || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: "Informe o estabelecimento e a data." }, { status: 400 });
    }
    const result = await listAvailability(getAdminDb(), companyId, date, professionalId);
    return NextResponse.json(result);
  } catch (error) {
    if (isCredentialError(error)) {
      return NextResponse.json({ error: CREDENTIAL_SETUP_MESSAGE }, { status: 503 });
    }
    const message = error instanceof Error ? error.message : "Não foi possível ver os horários.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
