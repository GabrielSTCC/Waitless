import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { loadSessionServer } from "@/lib/auth/session-server";
import {
  CREDENTIAL_SETUP_MESSAGE,
  getAdminDb,
  isCredentialError,
} from "@/lib/firebase/admin";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult instanceof Response) return authResult;

    const session = await loadSessionServer(getAdminDb(), authResult.uid);
    return NextResponse.json(session);
  } catch (error) {
    if (isCredentialError(error)) {
      return NextResponse.json({ error: CREDENTIAL_SETUP_MESSAGE }, { status: 503 });
    }

    console.error("[auth/session]", error);
    return NextResponse.json({ error: "Erro ao carregar sessão." }, { status: 500 });
  }
}
