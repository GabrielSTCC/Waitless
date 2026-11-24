import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { loadSessionServer } from "@/lib/auth/session-server";
import {
  CREDENTIAL_SETUP_MESSAGE,
  getAdminDb,
  isCredentialError,
} from "@/lib/firebase/admin";
import { reportError } from "@/lib/observability/report-error";
import {
  assignVacancyManuallyServer,
  closeVacancyServer,
  markNoShowServer,
  offerSpotToNextWaitingServer,
  removeToleranceExpiredServer,
} from "@/lib/queue/vacancy-server";

export const runtime = "nodejs";

const ACTIONS = [
  "offer",
  "assign",
  "close",
  "markNoShow",
  "toleranceExpired",
] as const;

type VacancyAction = (typeof ACTIONS)[number];

async function authorizeCompanyAccess(uid: string, companyId: string) {
  const db = getAdminDb();
  const session = await loadSessionServer(db, uid);
  if (session.member?.companyId !== companyId) {
    return null;
  }
  return { db, session };
}

export async function POST(request: NextRequest) {
  let companyId = "";
  try {
    const authResult = await authenticateRequest(request);
    if (authResult instanceof Response) return authResult;

    const body = (await request.json()) as {
      companyId?: string;
      action?: string;
      entryId?: string;
    };

    companyId = body.companyId?.trim() ?? "";
    const action = body.action as VacancyAction | undefined;
    const entryId = body.entryId?.trim();

    if (!companyId || !action || !ACTIONS.includes(action)) {
      return NextResponse.json(
        { error: "companyId e action válidos são obrigatórios." },
        { status: 400 },
      );
    }

    if (
      (action === "assign" ||
        action === "markNoShow" ||
        action === "toleranceExpired") &&
      !entryId
    ) {
      return NextResponse.json(
        { error: "entryId é obrigatório para esta ação." },
        { status: 400 },
      );
    }

    const authorized = await authorizeCompanyAccess(authResult.uid, companyId);
    if (!authorized) {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }

    const { db } = authorized;

    switch (action) {
      case "offer":
        await offerSpotToNextWaitingServer(db, companyId);
        break;
      case "assign":
        await assignVacancyManuallyServer(db, companyId, entryId!);
        break;
      case "close":
        await closeVacancyServer(db, companyId);
        break;
      case "markNoShow":
        await markNoShowServer(db, companyId, entryId!);
        break;
      case "toleranceExpired":
        await removeToleranceExpiredServer(db, companyId, entryId!);
        break;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isCredentialError(error)) {
      return NextResponse.json({ error: CREDENTIAL_SETUP_MESSAGE }, { status: 503 });
    }
    const message =
      error instanceof Error ? error.message : "Erro na operação de vaga.";
    void reportError(error, { route: "/api/admin/vacancy", companyId });
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
