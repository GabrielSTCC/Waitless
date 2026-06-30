import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { handleAuthApiError } from "@/lib/auth/api-error";
import { createOtpChallenge } from "@/lib/auth/two-factor-server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult instanceof Response) return authResult;

    const body = (await request.json().catch(() => ({}))) as {
      purpose?: unknown;
    };
    const purpose = body.purpose === "enable" ? "enable" : "login";

    const user = await getAdminAuth().getUser(authResult.uid);
    const email = user.email;
    if (!email) {
      return NextResponse.json(
        { error: "Conta sem e-mail vinculado." },
        { status: 400 },
      );
    }

    const { challengeId } = await createOtpChallenge(
      getAdminDb(),
      authResult.uid,
      email,
      purpose,
    );

    return NextResponse.json({ challengeId });
  } catch (error) {
    return handleAuthApiError("2fa/send", error, "Falha ao enviar código.");
  }
}
