import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { loadSessionServer } from "@/lib/auth/session-server";
import {
  CREDENTIAL_SETUP_MESSAGE,
  getAdminDb,
  isCredentialError,
} from "@/lib/firebase/admin";
import { createStaffInviteServer } from "@/lib/invites/create-invite-server";
import { canManageTeam, type InviteRole } from "@/lib/permissions";
import { PlanLimitError } from "@/lib/billing/plan-limits";
import { TrialExpiredError } from "@/lib/billing/trial";
import { reportError } from "@/lib/observability/report-error";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let companyId = "";
  try {
    const authResult = await authenticateRequest(request);
    if (authResult instanceof Response) return authResult;

    const body = (await request.json().catch(() => ({}))) as {
      companyId?: unknown;
      email?: unknown;
      role?: unknown;
      companyName?: unknown;
    };

    companyId = typeof body.companyId === "string" ? body.companyId.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const companyName =
      typeof body.companyName === "string" ? body.companyName.trim() : "";
    const roleRaw = typeof body.role === "string" ? body.role : "base";
    const role: InviteRole = roleRaw === "admin" ? "admin" : "base";

    if (!companyId || !email || !companyName) {
      return NextResponse.json(
        { error: "companyId, email e companyName são obrigatórios." },
        { status: 400 },
      );
    }

    const db = getAdminDb();
    const session = await loadSessionServer(db, authResult.uid);
    if (session.member?.companyId !== companyId) {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }

    const ownerId = session.company?.ownerId ?? "";
    if (!canManageTeam(authResult.uid, ownerId)) {
      return NextResponse.json(
        { error: "Apenas o dono pode convidar membros." },
        { status: 403 },
      );
    }

    const inviteId = await createStaffInviteServer(db, {
      companyId,
      email,
      createdBy: authResult.uid,
      companyName,
      role,
    });

    return NextResponse.json({ inviteId });
  } catch (error) {
    if (error instanceof PlanLimitError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof TrialExpiredError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (isCredentialError(error)) {
      return NextResponse.json({ error: CREDENTIAL_SETUP_MESSAGE }, { status: 503 });
    }
    void reportError(error, { route: "/api/invites", companyId });
    const message =
      error instanceof Error ? error.message : "Falha ao criar convite.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
