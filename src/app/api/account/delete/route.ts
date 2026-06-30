import { NextRequest, NextResponse } from "next/server";
import {
  CREDENTIAL_SETUP_MESSAGE,
  getAdminAuth,
  getAdminDb,
  getAdminStorage,
  isCredentialError,
} from "@/lib/firebase/admin";
import { deleteCompanyCascade } from "@/lib/firebase/delete-company-admin";
import { hasPaidSubscriptionData } from "@/lib/billing/trial";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const idToken = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    if (!idToken) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const decoded = await getAdminAuth().verifyIdToken(idToken);
    const body = (await request.json().catch(() => ({}))) as {
      confirmName?: unknown;
      acknowledgeActivePlanNoRefund?: unknown;
    };
    const confirmName =
      typeof body.confirmName === "string" ? body.confirmName.trim() : "";
    const acknowledgeActivePlanNoRefund = body.acknowledgeActivePlanNoRefund === true;

    if (!confirmName) {
      return NextResponse.json(
        { error: "Nome de confirmação obrigatório." },
        { status: 400 },
      );
    }

    const db = getAdminDb();
    const memberSnap = await db.doc(`members/${decoded.uid}`).get();

    if (!memberSnap.exists) {
      return NextResponse.json({ error: "Membro não encontrado." }, { status: 403 });
    }

    const companyId = memberSnap.data()?.companyId as string | undefined;
    if (!companyId) {
      return NextResponse.json({ error: "Empresa não vinculada." }, { status: 403 });
    }

    const companySnap = await db.doc(`companies/${companyId}`).get();
    if (!companySnap.exists) {
      return NextResponse.json({ error: "Empresa não encontrada." }, { status: 404 });
    }

    const companyData = companySnap.data()!;
    const ownerId = companyData.ownerId as string | undefined;

    if (decoded.uid !== ownerId) {
      return NextResponse.json(
        { error: "Somente o dono pode excluir o estabelecimento." },
        { status: 403 },
      );
    }

    const subscription = companyData.subscription as
      | { status?: string; planId?: string }
      | undefined;

    if (hasPaidSubscriptionData(subscription) && !acknowledgeActivePlanNoRefund) {
      return NextResponse.json(
        {
          error:
            "Confirme que entende que não haverá reembolso do plano ativo antes de excluir.",
        },
        { status: 400 },
      );
    }

    const companyName = (companyData.name as string | undefined)?.trim() ?? "";
    if (confirmName !== companyName) {
      return NextResponse.json(
        { error: "O nome informado não confere com o estabelecimento." },
        { status: 400 },
      );
    }

    await deleteCompanyCascade(
      db,
      getAdminStorage(),
      getAdminAuth(),
      companyId,
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Falha ao excluir o estabelecimento.";

    return NextResponse.json(
      {
        error: isCredentialError(error) ? CREDENTIAL_SETUP_MESSAGE : message,
      },
      { status: 500 },
    );
  }
}
