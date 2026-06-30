import { NextRequest, NextResponse } from "next/server";
import {
  CREDENTIAL_SETUP_MESSAGE,
  getAdminAuth,
  getAdminDb,
  getAdminStorage,
  isCredentialError,
} from "@/lib/firebase/admin";
import { deleteCompanyCascade } from "@/lib/firebase/delete-company-admin";
import { isNextResponse, verifyPlatformRequest } from "@/lib/platform/api-auth";
import { writePlatformAudit } from "@/lib/platform/audit";

export const maxDuration = 60;

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  const authResult = await verifyPlatformRequest(request);
  if (isNextResponse(authResult)) return authResult;

  try {
    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as { confirmName?: unknown };
    const confirmName =
      typeof body.confirmName === "string" ? body.confirmName.trim() : "";

    if (!confirmName) {
      return NextResponse.json(
        { error: "Nome de confirmação obrigatório." },
        { status: 400 },
      );
    }

    const db = getAdminDb();
    const companySnap = await db.doc(`companies/${id}`).get();

    if (!companySnap.exists) {
      return NextResponse.json({ error: "Empresa não encontrada." }, { status: 404 });
    }

    const companyData = companySnap.data()!;
    const companyName = companyData.name as string;

    if (confirmName !== companyName) {
      return NextResponse.json(
        { error: "Nome de confirmação não confere." },
        { status: 400 },
      );
    }

    await writePlatformAudit(db, {
      action: "company.delete",
      targetCompanyId: id,
      targetCompanyName: companyName,
      actorUid: authResult.uid,
      actorEmail: authResult.email,
    });

    await deleteCompanyCascade(
      db,
      getAdminStorage(),
      getAdminAuth(),
      id,
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isCredentialError(error)) {
      return NextResponse.json({ error: CREDENTIAL_SETUP_MESSAGE }, { status: 503 });
    }
    console.error("[platform/companies/[id]/delete]", error);
    return NextResponse.json({ error: "Erro ao excluir empresa." }, { status: 500 });
  }
}
