import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { loadSessionServer } from "@/lib/auth/session-server";
import {
  CREDENTIAL_SETUP_MESSAGE,
  getAdminDb,
  isCredentialError,
} from "@/lib/firebase/admin";
import { getMonthlyCompletionCountForCompany } from "@/lib/queue/queue-mutations-server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult instanceof Response) return authResult;

    const companyId = request.nextUrl.searchParams.get("companyId")?.trim();
    if (!companyId) {
      return NextResponse.json({ error: "companyId é obrigatório." }, { status: 400 });
    }

    const db = getAdminDb();
    const session = await loadSessionServer(db, authResult.uid);
    if (!session.member || session.member.companyId !== companyId) {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }

    const count = await getMonthlyCompletionCountForCompany(db, companyId);
    return NextResponse.json({ count });
  } catch (error) {
    if (isCredentialError(error)) {
      return NextResponse.json({ error: CREDENTIAL_SETUP_MESSAGE }, { status: 503 });
    }

    console.error("[admin/usage]", error);
    return NextResponse.json({ error: "Erro ao carregar uso mensal." }, { status: 500 });
  }
}
