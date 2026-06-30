import { NextRequest, NextResponse } from "next/server";
import { sendSupportReportEmail } from "@/lib/email/send-support-report";
import {
  CREDENTIAL_SETUP_MESSAGE,
  getAdminAuth,
  getAdminDb,
  isCredentialError,
} from "@/lib/firebase/admin";
import { getRoleLabel } from "@/lib/permissions";
import {
  getSupportCategoryLabel,
  validateSupportReportBody,
} from "@/lib/support/categories";
import type { Member } from "@/lib/types";

const VALIDATION_ERRORS: Record<string, string> = {
  INVALID_BODY: "Dados inválidos.",
  INVALID_CATEGORY: "Selecione uma categoria válida.",
  INVALID_DESCRIPTION: "Descreva o problema com pelo menos 20 caracteres.",
  INVALID_CUSTOM_CATEGORY: "Informe o tipo de problema (mínimo 3 caracteres).",
};

function resolveLocale(request: NextRequest): "pt-BR" | "en" {
  const accept = request.headers.get("Accept-Language")?.toLowerCase() ?? "";
  if (accept.startsWith("en")) return "en";
  return "pt-BR";
}

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
    const body = await request.json().catch(() => null);
    const validation = validateSupportReportBody(body);

    if (!validation.ok) {
      return NextResponse.json(
        { error: VALIDATION_ERRORS[validation.error] ?? "Dados inválidos." },
        { status: 400 },
      );
    }

    const db = getAdminDb();
    const memberSnap = await db.doc(`members/${decoded.uid}`).get();

    if (!memberSnap.exists) {
      return NextResponse.json({ error: "Membro não encontrado." }, { status: 403 });
    }

    const member = memberSnap.data() as Member;
    const companyId = member.companyId;

    if (!companyId) {
      return NextResponse.json({ error: "Empresa não vinculada." }, { status: 403 });
    }

    const companySnap = await db.doc(`companies/${companyId}`).get();
    if (!companySnap.exists) {
      return NextResponse.json({ error: "Empresa não encontrada." }, { status: 404 });
    }

    const companyData = companySnap.data()!;
    const companyName =
      (typeof companyData.name === "string" ? companyData.name.trim() : "") ||
      "Estabelecimento";
    const userEmail = decoded.email ?? "sem-e-mail@waitless.local";
    const locale = resolveLocale(request);
    const { category, customCategory, description } = validation.data;

    await sendSupportReportEmail({
      category,
      categoryLabel: getSupportCategoryLabel(category, locale),
      customCategory,
      description,
      companyName,
      companyId,
      userEmail,
      userId: decoded.uid,
      userRole: getRoleLabel(member.role),
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (isCredentialError(err)) {
      return NextResponse.json({ error: CREDENTIAL_SETUP_MESSAGE }, { status: 503 });
    }

    if (err instanceof Error && err.message === "EMAIL_NOT_CONFIGURED") {
      return NextResponse.json(
        { error: "Serviço de e-mail não configurado." },
        { status: 503 },
      );
    }

    console.error("[support/report]", err);
    return NextResponse.json(
      { error: "Não foi possível enviar o reporte. Tente novamente." },
      { status: 500 },
    );
  }
}
