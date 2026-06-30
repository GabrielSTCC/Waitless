import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb, isCredentialError } from "@/lib/firebase/admin";
import { isNextResponse, verifyPlatformRequest } from "@/lib/platform/api-auth";
import { writePlatformAudit } from "@/lib/platform/audit";
import { getCompanyDetail } from "@/lib/platform/companies";
import {
  applyPlatformSubscriptionOverride,
  parsePlatformSubscriptionOverride,
} from "@/lib/platform/subscription-admin";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const authResult = await verifyPlatformRequest(request);
  if (isNextResponse(authResult)) return authResult;

  try {
    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as {
      planId?: unknown;
      status?: unknown;
      reason?: unknown;
    };

    const input = parsePlatformSubscriptionOverride(body);
    const db = getAdminDb();
    const companySnap = await db.doc(`companies/${id}`).get();

    if (!companySnap.exists) {
      return NextResponse.json({ error: "Empresa não encontrada." }, { status: 404 });
    }

    const companyName = companySnap.data()?.name as string;
    const result = await applyPlatformSubscriptionOverride(db, id, input);

    await writePlatformAudit(db, {
      action: "company.change_plan",
      targetCompanyId: id,
      targetCompanyName: companyName,
      actorUid: authResult.uid,
      actorEmail: authResult.email,
      metadata: {
        previousPlanId: result.previousPlanId,
        newPlanId: result.newPlanId,
        previousStatus: result.previousStatus,
        newStatus: result.newStatus,
        reason: input.reason ?? null,
      },
    });

    const auth = getAdminAuth();
    const detail = await getCompanyDetail(db, auth, id);

    return NextResponse.json(detail);
  } catch (error) {
    if (error instanceof Error && error.message.includes("inválid")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof Error && error.message.includes("não encontrada")) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (isCredentialError(error)) {
      return NextResponse.json({ error: "Credenciais Firebase indisponíveis." }, { status: 503 });
    }
    console.error("[platform/companies/[id]/subscription]", error);
    return NextResponse.json({ error: "Erro ao alterar plano." }, { status: 500 });
  }
}
