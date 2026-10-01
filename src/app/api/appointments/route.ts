import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import {
  addProfessional,
  bookAppointment,
  callAppointment,
  confirmAppointmentByShop,
  deactivateProfessional,
  listAppointmentDayMarkers,
  listAppointmentsForDay,
  listProfessionals,
  passNextAppointment,
} from "@/lib/appointments/appointment-server";
import { loadMemberAccess, CompanyAccessError } from "@/lib/company/company-access-server";
import { getAdminDb, isCredentialError, CREDENTIAL_SETUP_MESSAGE } from "@/lib/firebase/admin";
import { canAccessRoute, canManageCompany } from "@/lib/permissions";

export const runtime = "nodejs";

async function staffCompany(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (auth instanceof Response) return auth;
  const db = getAdminDb();
  const member = await loadMemberAccess(db, auth.uid);
  if (!canAccessRoute(member.role, "/admin")) {
    throw new CompanyAccessError("forbidden", "Sem permissão.");
  }
  return { db, companyId: member.companyId, role: member.role };
}

export async function GET(request: NextRequest) {
  try {
    const access = await staffCompany(request);
    if (access instanceof Response) return access;

    const month = request.nextUrl.searchParams.get("month") ?? "";
    if (month) {
      if (!/^\d{4}-\d{2}$/.test(month)) {
        return NextResponse.json({ error: "Mês inválido." }, { status: 400 });
      }
      const markers = await listAppointmentDayMarkers(access.db, access.companyId, month);
      return NextResponse.json({ markers });
    }

    const date = request.nextUrl.searchParams.get("date") ?? "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: "Data inválida." }, { status: 400 });
    }
    const [appointments, professionals] = await Promise.all([
      listAppointmentsForDay(access.db, access.companyId, date),
      listProfessionals(access.db, access.companyId),
    ]);
    return NextResponse.json({
      appointments: appointments.map((item) => ({
        ...item,
        scheduledAt: item.scheduledAt.toISOString(),
        createdAt: item.createdAt.toISOString(),
        confirmedArrivalAt: item.confirmedArrivalAt?.toISOString(),
      })),
      professionals,
    });
  } catch (error) {
    return fail(error);
  }
}

function textField(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

type StaffAccess = {
  db: ReturnType<typeof getAdminDb>;
  companyId: string;
  role: string;
};

async function runProfessionalAction(
  access: StaffAccess,
  action: unknown,
  body: Record<string, unknown>,
) {
  if (action !== "add_professional" && action !== "remove_professional") return null;
  if (!canManageCompany(access.role)) {
    throw new CompanyAccessError("forbidden", "Somente dono ou admin podem cadastrar profissionais.");
  }
  if (action === "add_professional") {
    const professional = await addProfessional(access.db, access.companyId, textField(body.name));
    return NextResponse.json({ professional });
  }
  await deactivateProfessional(access.db, access.companyId, textField(body.professionalId));
  return NextResponse.json({ ok: true });
}

async function runBookStaff(access: StaffAccess, body: Record<string, unknown>) {
  const result = await bookAppointment(access.db, {
    companyId: access.companyId,
    name: textField(body.name),
    whatsapp: textField(body.whatsapp),
    scheduledAtIso: textField(body.scheduledAt),
    professionalId: typeof body.professionalId === "string" ? body.professionalId : undefined,
    confirmedByStaff: true,
  });
  return NextResponse.json(result);
}

async function runExistingAppointment(
  access: StaffAccess,
  action: unknown,
  body: Record<string, unknown>,
) {
  const appointmentId = textField(body.appointmentId);
  if (!appointmentId) {
    return NextResponse.json({ error: "Agendamento obrigatório." }, { status: 400 });
  }
  if (action === "confirm" || action === "reject") {
    await confirmAppointmentByShop(
      access.db,
      access.companyId,
      appointmentId,
      action === "confirm",
    );
    return NextResponse.json({ ok: true });
  }
  if (action === "pass") {
    await passNextAppointment(access.db, access.companyId, appointmentId);
    return NextResponse.json({ ok: true });
  }
  if (action === "call") {
    await callAppointment(
      access.db,
      access.companyId,
      appointmentId,
      typeof body.professionalId === "string" ? body.professionalId : undefined,
    );
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
}

async function runStaffAppointmentAction(access: StaffAccess, body: Record<string, unknown>) {
  const action = body.action;
  const professionalResponse = await runProfessionalAction(access, action, body);
  if (professionalResponse) return professionalResponse;
  if (action === "book_staff") return runBookStaff(access, body);
  return runExistingAppointment(access, action, body);
}

export async function POST(request: NextRequest) {
  try {
    const access = await staffCompany(request);
    if (access instanceof Response) return access;
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    return await runStaffAppointmentAction(access, body);
  } catch (error) {
    return fail(error);
  }
}

function fail(error: unknown) {
  if (error instanceof CompanyAccessError) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
  if (isCredentialError(error)) {
    return NextResponse.json({ error: CREDENTIAL_SETUP_MESSAGE }, { status: 503 });
  }
  const message = error instanceof Error ? error.message : "Não foi possível concluir.";
  return NextResponse.json({ error: message }, { status: 400 });
}
