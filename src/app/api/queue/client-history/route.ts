import { NextRequest, NextResponse } from "next/server";
import {
  CREDENTIAL_SETUP_MESSAGE,
  getAdminDb,
  isCredentialError,
} from "@/lib/firebase/admin";
import { listClientVisitsForToken } from "@/lib/firebase/client-visits-server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const token = typeof body.token === "string" ? body.token.trim() : "";

    if (!token) {
      return NextResponse.json({ error: "token obrigatório" }, { status: 400 });
    }

    getAdminDb();
    const result = await listClientVisitsForToken(token);
    if (!result) {
      return NextResponse.json({ error: "Link inválido." }, { status: 400 });
    }

    return NextResponse.json({
      visits: result.visits.map((v) => ({
        visitId: v.visitId,
        status: v.status,
        occurredAt: v.occurredAt.toISOString(),
      })),
      activeEntryId: result.activeEntryId,
    });
  } catch (error) {
    const message = isCredentialError(error)
      ? CREDENTIAL_SETUP_MESSAGE
      : error instanceof Error
        ? error.message
        : "Falha ao carregar histórico.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
