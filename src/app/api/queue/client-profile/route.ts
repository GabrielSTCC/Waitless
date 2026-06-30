import { NextRequest, NextResponse } from "next/server";
import {
  CREDENTIAL_SETUP_MESSAGE,
  getAdminDb,
  isCredentialError,
} from "@/lib/firebase/admin";
import { resolvePublicTokenContext } from "@/lib/firebase/client-visits-server";
import { maskWhatsappDisplay, normalizeWhatsapp } from "@/lib/utils/format";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const token = typeof body.token === "string" ? body.token.trim() : "";

    if (!token) {
      return NextResponse.json({ error: "token obrigatório" }, { status: 400 });
    }

    const db = getAdminDb();
    const ctx = await resolvePublicTokenContext(token);
    if (!ctx) {
      return NextResponse.json({ error: "Link inválido." }, { status: 400 });
    }

    const clientSnap = await db
      .doc(`companies/${ctx.companyId}/clients/${ctx.clientId}`)
      .get();

    const clientData = clientSnap.data();
    const clientName =
      (clientData?.name as string | undefined) ?? ctx.clientName ?? "";
    const whatsappRaw =
      (clientData?.whatsapp as string | undefined) ??
      (clientData?.normalizedWhatsapp as string | undefined) ??
      "";

    return NextResponse.json({
      clientName,
      maskedWhatsapp: whatsappRaw
        ? maskWhatsappDisplay(normalizeWhatsapp(whatsappRaw))
        : "••••",
      companyName: ctx.companyName ?? "",
      locale: ctx.locale ?? "pt-BR",
    });
  } catch (error) {
    const message = isCredentialError(error)
      ? CREDENTIAL_SETUP_MESSAGE
      : error instanceof Error
        ? error.message
        : "Falha ao carregar perfil.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
