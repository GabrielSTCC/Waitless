import { NextRequest, NextResponse } from "next/server";
import {
  CREDENTIAL_SETUP_MESSAGE,
  getAdminDb,
  isCredentialError,
} from "@/lib/firebase/admin";
import { isNextResponse, verifyPlatformRequest } from "@/lib/platform/api-auth";
import {
  appendSupportMessage,
  getSupportThread,
  listSupportMessages,
  markSupportThreadRead,
  validateSupportMessageBody,
} from "@/lib/support/chat-server";

interface RouteContext {
  params: Promise<{ companyId: string }>;
}

const BODY_ERRORS: Record<string, string> = {
  INVALID_BODY: "Mensagem inválida.",
  EMPTY: "Escreva uma mensagem.",
  TOO_LONG: "Mensagem muito longa (máximo 4000 caracteres).",
};

export async function GET(request: NextRequest, context: RouteContext) {
  const authResult = await verifyPlatformRequest(request);
  if (isNextResponse(authResult)) return authResult;

  try {
    const { companyId } = await context.params;
    if (!companyId?.trim()) {
      return NextResponse.json({ error: "Empresa inválida." }, { status: 400 });
    }

    const db = getAdminDb();
    const thread = await getSupportThread(db, companyId);
    if (!thread) {
      const companySnap = await db.doc(`companies/${companyId}`).get();
      if (!companySnap.exists) {
        return NextResponse.json({ error: "Empresa não encontrada." }, { status: 404 });
      }
      const companyData = companySnap.data()!;
      const companyName =
        (typeof companyData.name === "string" ? companyData.name.trim() : "") ||
        "Estabelecimento";
      const ownerId = typeof companyData.ownerId === "string" ? companyData.ownerId : "";
      return NextResponse.json({
        thread: {
          companyId,
          companyName,
          ownerId,
          lastMessageAt: null,
          lastMessagePreview: "",
          unreadForPlatform: 0,
          unreadForTenant: 0,
          updatedAt: null,
        },
        messages: [] as const,
      });
    }

    const [messages, marked] = await Promise.all([
      listSupportMessages(db, companyId),
      markSupportThreadRead(db, companyId, "platform"),
    ]);

    return NextResponse.json({
      thread: marked ?? thread,
      messages,
    });
  } catch (err) {
    if (isCredentialError(err)) {
      return NextResponse.json({ error: CREDENTIAL_SETUP_MESSAGE }, { status: 503 });
    }
    console.error("[platform/support/threads/[companyId] GET]", err);
    return NextResponse.json(
      { error: "Não foi possível carregar o chat." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const authResult = await verifyPlatformRequest(request);
  if (isNextResponse(authResult)) return authResult;

  try {
    const { companyId } = await context.params;
    if (!companyId?.trim()) {
      return NextResponse.json({ error: "Empresa inválida." }, { status: 400 });
    }

    const payload = await request.json().catch(() => null);
    const validation = validateSupportMessageBody(
      payload && typeof payload === "object" ? (payload as { body?: unknown }).body : null,
    );
    if (!validation.ok) {
      return NextResponse.json(
        { error: BODY_ERRORS[validation.error] ?? "Mensagem inválida." },
        { status: 400 },
      );
    }

    const db = getAdminDb();
    const companySnap = await db.doc(`companies/${companyId}`).get();
    if (!companySnap.exists) {
      return NextResponse.json({ error: "Empresa não encontrada." }, { status: 404 });
    }

    const companyData = companySnap.data()!;
    const companyName =
      (typeof companyData.name === "string" ? companyData.name.trim() : "") ||
      "Estabelecimento";
    const ownerId = typeof companyData.ownerId === "string" ? companyData.ownerId : "";

    const existing = await getSupportThread(db, companyId);
    const result = await appendSupportMessage(db, {
      companyId,
      companyName: existing?.companyName || companyName,
      ownerId: existing?.ownerId || ownerId,
      senderType: "platform",
      senderUid: authResult.uid,
      senderName: authResult.email || "Suporte Waitless",
      body: validation.body,
    });

    return NextResponse.json(result);
  } catch (err) {
    if (isCredentialError(err)) {
      return NextResponse.json({ error: CREDENTIAL_SETUP_MESSAGE }, { status: 503 });
    }
    console.error("[platform/support/threads/[companyId] POST]", err);
    return NextResponse.json(
      { error: "Não foi possível enviar a mensagem." },
      { status: 500 },
    );
  }
}
