import { NextRequest, NextResponse } from "next/server";
import { cancelAppointment } from "@/lib/appointments/appointment-server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { loadMemberAccess, CompanyAccessError } from "@/lib/company/company-access-server";
import { canManageCompany } from "@/lib/permissions";
import { getAdminDb, isCredentialError, CREDENTIAL_SETUP_MESSAGE } from "@/lib/firebase/admin";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const token = typeof body.token === "string" ? body.token.trim() : "";
    const appointmentId =
      typeof body.appointmentId === "string" ? body.appointmentId.trim() : "";
    const db = getAdminDb();

    if (token) {
      const result = await cancelAppointment(db, { token });
      return NextResponse.json({ ok: true, ...result });
    }

    if (!appointmentId) {
      return NextResponse.json({ error: "Informe o agendamento." }, { status: 400 });
    }

    const auth = await authenticateRequest(request);
    if (auth instanceof Response) return auth;
    const member = await loadMemberAccess(db, auth.uid);
    if (!canManageCompany(member.role)) {
      throw new CompanyAccessError("forbidden", "Sem permissão para cancelar.");
    }
    const result = await cancelAppointment(db, {
      companyId: member.companyId,
      appointmentId,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (isCredentialError(error)) {
      return NextResponse.json({ error: CREDENTIAL_SETUP_MESSAGE }, { status: 503 });
    }
    if (error instanceof CompanyAccessError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    const message = error instanceof Error ? error.message : "Não foi possível cancelar.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
