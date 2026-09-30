import { NextRequest, NextResponse } from "next/server";
import { bookAppointment } from "@/lib/appointments/appointment-server";
import { getAdminDb, isCredentialError, CREDENTIAL_SETUP_MESSAGE } from "@/lib/firebase/admin";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const companyId = typeof body.companyId === "string" ? body.companyId.trim() : "";
    const name = typeof body.name === "string" ? body.name : "";
    const whatsapp = typeof body.whatsapp === "string" ? body.whatsapp : "";
    const scheduledAt = typeof body.scheduledAt === "string" ? body.scheduledAt : "";
    const professionalId =
      typeof body.professionalId === "string" ? body.professionalId : undefined;
    if (!companyId) {
      return NextResponse.json({ error: "Estabelecimento obrigatório." }, { status: 400 });
    }
    const result = await bookAppointment(getAdminDb(), {
      companyId,
      name,
      whatsapp,
      scheduledAtIso: scheduledAt,
      professionalId,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (isCredentialError(error)) {
      return NextResponse.json({ error: CREDENTIAL_SETUP_MESSAGE }, { status: 503 });
    }
    const message = error instanceof Error ? error.message : "Não foi possível agendar.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
