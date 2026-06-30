import { NextRequest, NextResponse } from "next/server";
import {
  CREDENTIAL_SETUP_MESSAGE,
  getAdminDb,
  isCredentialError,
} from "@/lib/firebase/admin";
import { respondToSpotOfferServer } from "@/lib/firebase/vacancy-server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const token = typeof body.token === "string" ? body.token.trim() : "";
    const response = body.response;

    if (!token) {
      return NextResponse.json({ error: "token obrigatório" }, { status: 400 });
    }
    if (response !== "accept" && response !== "decline") {
      return NextResponse.json({ error: "response inválida" }, { status: 400 });
    }

    getAdminDb();
    const result = await respondToSpotOfferServer(token, response === "accept");
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = isCredentialError(error)
      ? CREDENTIAL_SETUP_MESSAGE
      : error instanceof Error
        ? error.message
        : "Falha ao processar resposta.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
