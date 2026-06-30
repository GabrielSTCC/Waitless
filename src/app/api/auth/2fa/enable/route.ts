import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { handleAuthApiError } from "@/lib/auth/api-error";
import { enableTwoFactorSecurity } from "@/lib/auth/member-security-admin";
import {
  createOtpChallenge,
  parseMemberSecurity,
  registerTrustedDevice,
  verifyOtpChallengeForPurpose,
} from "@/lib/auth/two-factor-server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult instanceof Response) return authResult;

    const user = await getAdminAuth().getUser(authResult.uid);
    if (!user.email) {
      return NextResponse.json(
        { error: "Conta sem e-mail vinculado." },
        { status: 400 },
      );
    }

    const db = getAdminDb();
    const memberSnap = await db.doc(`members/${authResult.uid}`).get();
    const security = parseMemberSecurity(
      memberSnap.data()?.security as Record<string, unknown> | undefined,
    );

    if (security.twoFactorEnabled) {
      return NextResponse.json(
        { error: "Verificação em duas etapas já está ativa." },
        { status: 409 },
      );
    }

    const body = (await request.json().catch(() => ({}))) as {
      challengeId?: unknown;
      code?: unknown;
      trustDevice?: unknown;
    };

    const challengeId =
      typeof body.challengeId === "string" ? body.challengeId.trim() : "";
    const code = typeof body.code === "string" ? body.code.trim() : "";

    if (!challengeId || !code) {
      const { challengeId: newChallengeId } = await createOtpChallenge(
        db,
        authResult.uid,
        user.email,
        "enable",
      );
      return NextResponse.json({
        requiresCode: true,
        challengeId: newChallengeId,
      });
    }

    if (!/^\d{4}$/.test(code)) {
      return NextResponse.json({ error: "Código inválido." }, { status: 400 });
    }

    const valid = await verifyOtpChallengeForPurpose(
      db,
      challengeId,
      authResult.uid,
      code,
      "enable",
    );

    if (!valid) {
      return NextResponse.json(
        { error: "Código incorreto ou expirado." },
        { status: 400 },
      );
    }

    if (body.trustDevice === true && authResult.device) {
      await registerTrustedDevice(db, authResult.uid, authResult.device);
    }

    await enableTwoFactorSecurity(db, authResult.uid);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleAuthApiError("2fa/enable", error, "Falha ao habilitar 2FA.");
  }
}
