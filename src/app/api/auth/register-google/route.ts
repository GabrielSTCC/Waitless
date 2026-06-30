import { NextRequest, NextResponse } from "next/server";
import {
  CREDENTIAL_SETUP_MESSAGE,
  isCredentialError,
} from "@/lib/firebase/admin";
import {
  RegisterUserError,
  finalizeGoogleUserWithReadableUid,
} from "@/lib/auth/register-user-server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      idToken?: unknown;
      provisionalUid?: unknown;
    };

    const idToken = typeof body.idToken === "string" ? body.idToken.trim() : "";
    const provisionalUid =
      typeof body.provisionalUid === "string" ? body.provisionalUid.trim() : "";

    if (!idToken || !provisionalUid) {
      return NextResponse.json({ error: "Sessão Google inválida." }, { status: 400 });
    }

    const result = await finalizeGoogleUserWithReadableUid({ idToken, provisionalUid });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof RegisterUserError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (isCredentialError(error)) {
      return NextResponse.json({ error: CREDENTIAL_SETUP_MESSAGE }, { status: 503 });
    }
    console.error("[auth/register-google]", error);
    return NextResponse.json({ error: "Erro ao finalizar cadastro com Google." }, { status: 500 });
  }
}
