import { NextRequest, NextResponse } from "next/server";
import {
  CREDENTIAL_SETUP_MESSAGE,
  getAdminAuth,
  getAdminDb,
  isCredentialError,
} from "@/lib/firebase/admin";
import { parseDeviceContext } from "@/lib/auth/two-factor-server";
import { sendPlatformAlert } from "@/lib/email/send-platform-alert";
import {
  assertPlatformAdmin,
  getPlatformAdminEmail,
  PlatformAuthError,
} from "@/lib/platform/auth";
import { writePlatformAuthAudit } from "@/lib/platform/audit";
import { verifyPlatformLoginOtp, markPlatformLoginOtpUsed } from "@/lib/platform/platform-otp";
import { getRequestMeta } from "@/lib/platform/request-meta";
import {
  createPlatformSessionToken,
  setPlatformSessionCookie,
} from "@/lib/platform/session";
import {
  registerPlatformTrustedDevice,
  touchPlatformAdminSession,
} from "@/lib/platform/trusted-devices";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const idToken = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    if (!idToken) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const decoded = await getAdminAuth().verifyIdToken(idToken);
    assertPlatformAdmin(decoded);

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
      return NextResponse.json({ error: "Código inválido." }, { status: 400 });
    }

    const db = getAdminDb();
    const meta = getRequestMeta(request);
    const valid = await verifyPlatformLoginOtp(db, challengeId, decoded.uid, code, {
      markUsed: false,
    });

    if (!valid) {
      await sendPlatformAlert("otp_failed", meta).catch((err) =>
        console.error("[platform/auth/verify] alert", err),
      );
      await writePlatformAuthAudit(db, {
        action: "platform.otp_failed",
        actorUid: decoded.uid,
        actorEmail: decoded.email,
        metadata: meta,
      }).catch((err) => console.error("[platform/auth/verify] audit", err));
      return NextResponse.json({ error: "Código inválido ou expirado." }, { status: 400 });
    }

    if (trustDevice) {
      const device = parseDeviceContext(
        request.headers.get("X-Waitless-Device-Id"),
        request.headers.get("X-Waitless-User-Agent"),
      );
      if (device) {
        await registerPlatformTrustedDevice(db, decoded.uid, device);
      }
    }

    await touchPlatformAdminSession(db, decoded.uid, getPlatformAdminEmail());

    const token = await createPlatformSessionToken({
      uid: decoded.uid,
      email: getPlatformAdminEmail(),
      platformAdmin: true,
    });

    await markPlatformLoginOtpUsed(db, challengeId);

    const response = NextResponse.json({ ok: true });
    setPlatformSessionCookie(response, token);

    await sendPlatformAlert("login_success", { ...meta, trustedDevice: false }).catch((err) =>
      console.error("[platform/auth/verify] alert", err),
    );
    await writePlatformAuthAudit(db, {
      action: "platform.login_success",
      actorUid: decoded.uid,
      actorEmail: getPlatformAdminEmail(),
      metadata: { ...meta, trustedDevice: false, viaOtp: true },
    }).catch((err) => console.error("[platform/auth/verify] audit", err));

    return response;
  } catch (error) {
    if (error instanceof PlatformAuthError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (isCredentialError(error)) {
      return NextResponse.json({ error: CREDENTIAL_SETUP_MESSAGE }, { status: 503 });
    }
    if (error instanceof Error && error.message.includes("PLATFORM_SESSION_SECRET")) {
      return NextResponse.json(
        { error: "Sessão da plataforma não configurada no servidor." },
        { status: 503 },
      );
    }
    console.error("[platform/auth/verify]", error);
    return NextResponse.json({ error: "Erro ao verificar código." }, { status: 500 });
  }
}
