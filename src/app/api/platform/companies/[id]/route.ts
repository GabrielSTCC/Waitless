import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb, isCredentialError } from "@/lib/firebase/admin";
import { isNextResponse, verifyPlatformRequest } from "@/lib/platform/api-auth";
import { writePlatformAudit } from "@/lib/platform/audit";
import { getCompanyDetail } from "@/lib/platform/companies";
import type { PlatformControlStatus } from "@/lib/types";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const authResult = await verifyPlatformRequest(request);
  if (isNextResponse(authResult)) return authResult;

  try {
    const { id } = await context.params;
    const db = getAdminDb();
    const auth = getAdminAuth();
    const detail = await getCompanyDetail(db, auth, id);

    if (!detail) {
      return NextResponse.json({ error: "Empresa não encontrada." }, { status: 404 });
    }

    return NextResponse.json(detail);
  } catch (error) {
    if (isCredentialError(error)) {
      return NextResponse.json({ error: "Credenciais Firebase indisponíveis." }, { status: 503 });
    }
    console.error("[platform/companies/[id]]", error);
    return NextResponse.json({ error: "Erro ao carregar empresa." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const authResult = await verifyPlatformRequest(request);
  if (isNextResponse(authResult)) return authResult;

  try {
    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as {
      status?: PlatformControlStatus;
      reason?: string;
    };

    const validStatuses: PlatformControlStatus[] = ["active", "suspended", "paused"];
    if (!body.status || !validStatuses.includes(body.status)) {
      return NextResponse.json({ error: "Status inválido." }, { status: 400 });
    }

    const db = getAdminDb();
    const companyRef = db.doc(`companies/${id}`);
    const companySnap = await companyRef.get();

    if (!companySnap.exists) {
      return NextResponse.json({ error: "Empresa não encontrada." }, { status: 404 });
    }

    const companyName = companySnap.data()?.name as string;

    await companyRef.set(
      {
        platformControl: {
          status: body.status,
          reason: body.reason?.trim() || null,
          updatedAt: FieldValue.serverTimestamp(),
          updatedBy: authResult.uid,
        },
      },
      { merge: true },
    );

    const action =
      body.status === "active"
        ? "company.reactivate"
        : body.status === "suspended"
          ? "company.suspend"
          : "company.pause";

    await writePlatformAudit(db, {
      action,
      targetCompanyId: id,
      targetCompanyName: companyName,
      actorUid: authResult.uid,
      actorEmail: authResult.email,
      metadata: { reason: body.reason?.trim() || null },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isCredentialError(error)) {
      return NextResponse.json({ error: "Credenciais Firebase indisponíveis." }, { status: 503 });
    }
    console.error("[platform/companies/[id] PATCH]", error);
    return NextResponse.json({ error: "Erro ao atualizar empresa." }, { status: 500 });
  }
}
