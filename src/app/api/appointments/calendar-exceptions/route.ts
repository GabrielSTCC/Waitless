import { NextRequest, NextResponse } from "next/server";
import {
  deleteCalendarException,
  listCalendarExceptions,
  parseCalendarExceptionInput,
  upsertCalendarException,
} from "@/lib/appointments/calendar-exceptions-server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { loadMemberAccess, CompanyAccessError } from "@/lib/company/company-access-server";
import { canManageCompany } from "@/lib/permissions";
import { getAdminDb, isCredentialError, CREDENTIAL_SETUP_MESSAGE } from "@/lib/firebase/admin";

export const runtime = "nodejs";

async function staffAccess(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (auth instanceof Response) return auth;
  const db = getAdminDb();
  const member = await loadMemberAccess(db, auth.uid);
  if (!canManageCompany(member.role)) {
    throw new CompanyAccessError("forbidden", "Sem permissão.");
  }
  return { db, companyId: member.companyId };
}

function fail(error: unknown) {
  if (isCredentialError(error)) {
    return NextResponse.json({ error: CREDENTIAL_SETUP_MESSAGE }, { status: 503 });
  }
  if (error instanceof CompanyAccessError) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
  const message = error instanceof Error ? error.message : "Falha na requisição.";
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET(request: NextRequest) {
  try {
    const access = await staffAccess(request);
    if (access instanceof Response) return access;
    const exceptions = await listCalendarExceptions(access.db, access.companyId);
    return NextResponse.json({ exceptions });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await staffAccess(request);
    if (access instanceof Response) return access;
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const input = parseCalendarExceptionInput(body);
    const exception = await upsertCalendarException(access.db, access.companyId, input);
    return NextResponse.json({ exception });
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const access = await staffAccess(request);
    if (access instanceof Response) return access;
    let date = request.nextUrl.searchParams.get("date");
    if (!date) {
      const body = (await request.json().catch(() => ({}))) as { date?: string };
      date = body.date ?? null;
    }
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: "Informe a data." }, { status: 400 });
    }
    await deleteCalendarException(access.db, access.companyId, date);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
