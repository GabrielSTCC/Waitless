import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { handleAuthApiError } from "@/lib/auth/api-error";
import {
  clearTwoFactorPending,
  registerTrustedDevice,
  resetFailedLogins,
  verifyOtpChallengeForPurpose,
} from "@/lib/auth/two-factor-server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult instanceof Response) return authResult;

    const body = (await request.json().catch(() => ({}))) as {
      challengeId?: unknown;
      code?: unknown;
      trustDevice?: unknown;
    };

    const challengeId =
      typeof body.challengeId === "string" ? body.challengeId.trim() : "";
    const code = typeof body.code === "string" ? body.code.trim() : "";
    const trustDevice = body.trustDevice === true;

    if (!challengeId || !/^\d{4}$/.test(code)) {
      return NextResponse.json(
        { error: "Código inválido." },
        { status: 400 },
      );
    }

    const db = getAdminDb();
    const valid = await verifyOtpChallengeForPurpose(
      db,
      challengeId,
      authResult.uid,
      code,
      "login",
    );

    if (!valid) {
      return NextResponse.json(
        { error: "Código incorreto ou expirado." },
        { status: 400 },
      );
    }

    if (trustDevice && authResult.device) {
      await registerTrustedDevice(db, authResult.uid, authResult.device);
    }

    await clearTwoFactorPending(db, authResult.uid);

    const user = await getAdminAuth().getUser(authResult.uid);
    if (user.email) {
      await resetFailedLogins(db, user.email);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleAuthApiError("2fa/verify", error, "Falha ao verificar código.");
  }
}
