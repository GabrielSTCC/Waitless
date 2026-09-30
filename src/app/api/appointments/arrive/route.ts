import { NextRequest, NextResponse } from "next/server";
import { confirmArrival } from "@/lib/appointments/appointment-server";
import { getAdminDb, isCredentialError, CREDENTIAL_SETUP_MESSAGE } from "@/lib/firebase/admin";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const token = typeof body.token === "string" ? body.token.trim() : "";
    if (!token) {
      return NextResponse.json({ error: "Link inválido." }, { status: 400 });
    }
    await confirmArrival(getAdminDb(), token);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isCredentialError(error)) {
      return NextResponse.json({ error: CREDENTIAL_SETUP_MESSAGE }, { status: 503 });
    }
    const message = error instanceof Error ? error.message : "Não foi possível confirmar.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
