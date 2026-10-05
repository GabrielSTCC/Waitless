import { NextRequest, NextResponse } from "next/server";
import type { Firestore } from "firebase-admin/firestore";
import { authenticateRequest } from "@/lib/auth/api-auth";
import {
  CREDENTIAL_SETUP_MESSAGE,
  getAdminDb,
  isCredentialError,
} from "@/lib/firebase/admin";
import { canManageCompany } from "@/lib/permissions";
import {
  appendSupportMessage,
  getSupportThread,
  listSupportMessages,
  markSupportThreadRead,
  validateSupportMessageBody,
} from "@/lib/support/chat-server";
import type { Member } from "@/lib/types";

const BODY_ERRORS: Record<string, string> = {
  INVALID_BODY: "Mensagem inválida.",
  EMPTY: "Escreva uma mensagem.",
  TOO_LONG: "Mensagem muito longa (máximo 4000 caracteres).",
};

type TenantContext = {
  db: Firestore;
  member: Member;
  companyId: string;
  companyName: string;
  ownerId: string;
};

async function resolveTenantMember(
  uid: string,
): Promise<TenantContext | NextResponse> {
  const db = getAdminDb();
  const memberSnap = await db.doc(`members/${uid}`).get();
  if (!memberSnap.exists) {
    return NextResponse.json({ error: "Membro não encontrado." }, { status: 403 });
  }

  const member = memberSnap.data() as Member;
  if (!canManageCompany(member.role)) {
    return NextResponse.json(
      { error: "Apenas Dono e Admin podem usar o chat de suporte." },
      { status: 403 },
    );
  }

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
  const ownerId = typeof companyData.ownerId === "string" ? companyData.ownerId : "";

  return { db, member, companyId, companyName, ownerId };
}

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (auth instanceof Response) return auth;

  try {
    const resolved = await resolveTenantMember(auth.uid);
    if (resolved instanceof NextResponse) return resolved;

    const { db, companyId } = resolved;
    const thread = await getSupportThread(db, companyId);
    if (!thread) {
      return NextResponse.json({
        thread: null,
        messages: [] as const,
      });
    }

    const [messages, marked] = await Promise.all([
      listSupportMessages(db, companyId),
      markSupportThreadRead(db, companyId, "tenant"),
    ]);

    return NextResponse.json({
      thread: marked ?? thread,
      messages,
    });
  } catch (err) {
    if (isCredentialError(err)) {
      return NextResponse.json({ error: CREDENTIAL_SETUP_MESSAGE }, { status: 503 });
    }
    console.error("[support/chat GET]", err);
    return NextResponse.json(
      { error: "Não foi possível carregar o chat." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (auth instanceof Response) return auth;

  try {
    const resolved = await resolveTenantMember(auth.uid);
    if (resolved instanceof NextResponse) return resolved;

    const { db, member, companyId, companyName, ownerId } = resolved;
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

    const senderName =
      (typeof member.email === "string" && member.email.trim()) ||
      auth.email ||
      "Equipe";

    const result = await appendSupportMessage(db, {
      companyId,
      companyName,
      ownerId,
      senderType: "tenant",
      senderUid: auth.uid,
      senderName,
      body: validation.body,
    });

    return NextResponse.json(result);
  } catch (err) {
    if (isCredentialError(err)) {
      return NextResponse.json({ error: CREDENTIAL_SETUP_MESSAGE }, { status: 503 });
    }
    console.error("[support/chat POST]", err);
    return NextResponse.json(
      { error: "Não foi possível enviar a mensagem." },
      { status: 500 },
    );
  }
}
