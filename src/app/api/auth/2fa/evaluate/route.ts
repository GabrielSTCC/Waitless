import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { handleAuthApiError } from "@/lib/auth/api-error";
import {
  evaluateTwoFactorRequired,
  parseMemberSecurity,
  setTwoFactorPending,
} from "@/lib/auth/two-factor-server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult instanceof Response) return authResult;

    const db = getAdminDb();
    const memberSnap = await db.doc(`members/${authResult.uid}`).get();
    if (!memberSnap.exists) {
      return NextResponse.json(
        { error: "Membro não encontrado." },
        { status: 404 },
      );
    }

    const security = parseMemberSecurity(
      memberSnap.data()?.security as Record<string, unknown> | undefined,
    );

    const evaluation = await evaluateTwoFactorRequired(
      db,
      authResult.uid,
      security,
      authResult.device,
    );

    if (evaluation.required) {
      await setTwoFactorPending(db, authResult.uid, true);
    } else {
      await setTwoFactorPending(db, authResult.uid, false);
    }

    return NextResponse.json(evaluation);
  } catch (error) {
    return handleAuthApiError("2fa/evaluate", error, "Falha ao avaliar 2FA.");
  }
}
