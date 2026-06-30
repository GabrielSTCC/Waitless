import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { loadSessionServer } from "@/lib/auth/session-server";
import { loadAnalyticsServer } from "@/lib/analytics/analytics-server";
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

    const companyId = request.nextUrl.searchParams.get("companyId")?.trim();
    const sinceRaw = request.nextUrl.searchParams.get("since")?.trim();

    if (!companyId) {
      return NextResponse.json({ error: "companyId é obrigatório." }, { status: 400 });
    }

    const since = sinceRaw ? new Date(sinceRaw) : new Date();
    if (Number.isNaN(since.getTime())) {
      return NextResponse.json({ error: "since inválido." }, { status: 400 });
    }

    const db = getAdminDb();
    const session = await loadSessionServer(db, authResult.uid);
    if (!session.member || session.member.companyId !== companyId) {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }

    const payload = await loadAnalyticsServer(db, companyId, since);
    return NextResponse.json(payload);
  } catch (error) {
    if (isCredentialError(error)) {
      return NextResponse.json({ error: CREDENTIAL_SETUP_MESSAGE }, { status: 503 });
    }

    console.error("[admin/analytics]", error);
    return NextResponse.json({ error: "Erro ao carregar analytics." }, { status: 500 });
  }
}
