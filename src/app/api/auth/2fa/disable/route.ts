import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { handleAuthApiError } from "@/lib/auth/api-error";
import { disableTwoFactorSecurity } from "@/lib/auth/member-security-admin";
import { revokeAllTrustedDevices } from "@/lib/auth/two-factor-server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult instanceof Response) return authResult;

    const db = getAdminDb();
    await revokeAllTrustedDevices(db, authResult.uid);
    await disableTwoFactorSecurity(db, authResult.uid);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleAuthApiError("2fa/disable", error, "Falha ao desabilitar 2FA.");
  }
}
