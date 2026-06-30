import { NextRequest, NextResponse } from "next/server";
import {
  CREDENTIAL_SETUP_MESSAGE,
  isCredentialError,
} from "@/lib/firebase/admin";
import {
  RegisterUserError,
  registerEmailUserWithReadableUid,
} from "@/lib/auth/register-user-server";
import { assertPasswordValid, isPasswordValidationError } from "@/lib/auth/password-policy";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      email?: unknown;
      password?: unknown;
    };

    const email = typeof body.email === "string" ? body.email.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!email || !password) {
      return NextResponse.json({ error: "E-mail e senha são obrigatórios." }, { status: 400 });
    }

    assertPasswordValid(password);

    const { uid, customToken } = await registerEmailUserWithReadableUid(email, password);
    return NextResponse.json({ uid, customToken });
  } catch (error) {
    if (isPasswordValidationError(error)) {
      return NextResponse.json(
        { error: "A senha não atende aos requisitos de segurança." },
        { status: 400 },
      );
    }
    if (error instanceof RegisterUserError) {
      const status =
        error.code === "email_in_use" ? 409 : error.code === "weak_password" ? 400 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    if (isCredentialError(error)) {
      return NextResponse.json({ error: CREDENTIAL_SETUP_MESSAGE }, { status: 503 });
    }
    console.error("[auth/register]", error);
    return NextResponse.json({ error: "Erro ao criar conta." }, { status: 500 });
  }
}
