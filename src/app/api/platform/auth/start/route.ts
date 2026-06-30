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
  isAuthorizedPlatformEmail,
  PlatformAuthError,
} from "@/lib/platform/auth";
import { writePlatformAuthAudit } from "@/lib/platform/audit";
import { getRequestMeta } from "@/lib/platform/request-meta";
import { createPlatformLoginOtp } from "@/lib/platform/platform-otp";
import {
  createPlatformSessionToken,
  setPlatformSessionCookie,
} from "@/lib/platform/session";
import {
  isPlatformDeviceTrusted,
  touchPlatformAdminSession,
} from "@/lib/platform/trusted-devices";

export const runtime = "nodejs";

function mapStartError(error: unknown): { message: string; status: number } {
  if (isCredentialError(error)) {
    return { message: CREDENTIAL_SETUP_MESSAGE, status: 503 };
  }

  const message = error instanceof Error ? error.message : "Erro ao iniciar sessão.";

  if (message.includes("PLATFORM_SESSION_SECRET")) {
    return {
      message: "Sessão da plataforma não configurada no servidor (PLATFORM_SESSION_SECRET).",
      status: 503,
    };
  }

  if (
    message.includes("e-mail não configurado") ||
    message.includes("Falha ao enviar e-mail")
  ) {
    return {
      message:
        "Envio de e-mail não configurado. Defina RESEND_API_KEY e RESEND_FROM_EMAIL na Vercel.",
      status: 503,
    };
  }

  return { message: message || "Erro ao iniciar sessão.", status: 500 };
}

async function issueSession(
  request: NextRequest,
  uid: string,
  email: string,
  trustedDevice: boolean,
): Promise<NextResponse> {
  const db = getAdminDb();
  const meta = getRequestMeta(request);

  await touchPlatformAdminSession(db, uid, email);

  const token = await createPlatformSessionToken({
    uid,
    email,
    platformAdmin: true,
  });

  const response = NextResponse.json({ ok: true, requiresOtp: false });
  setPlatformSessionCookie(response, token);

  void sendPlatformAlert("login_success", { ...meta, trustedDevice });
  void writePlatformAuthAudit(db, {
    action: "platform.login_success",
    actorUid: uid,
    actorEmail: email,
    metadata: { ...meta, trustedDevice },
  });

  return response;
}

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
    const meta = getRequestMeta(request);
    const db = getAdminDb();

    if (!isAuthorizedPlatformEmail(decoded.email)) {
      void sendPlatformAlert("login_failed_unauthorized", {
        ...meta,
        attemptedEmail: decoded.email,
      });
      void writePlatformAuthAudit(db, {
        action: "platform.login_failed",
        actorUid: decoded.uid,
        actorEmail: decoded.email,
        metadata: { ...meta, reason: "unauthorized_email" },
      });
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }

    try {
      assertPlatformAdmin(decoded);
    } catch {
      void sendPlatformAlert("login_failed_unauthorized", {
        ...meta,
        attemptedEmail: decoded.email,
      });
      void writePlatformAuthAudit(db, {
        action: "platform.login_failed",
        actorUid: decoded.uid,
        actorEmail: decoded.email,
        metadata: { ...meta, reason: "missing_claim" },
      });
      return NextResponse.json(
        {
          error:
            "Acesso negado. Conceda a claim platformAdmin ao usuário autorizado (npm run grant:platform-admin).",
        },
        { status: 403 },
      );
    }

    const device = parseDeviceContext(
      request.headers.get("X-Waitless-Device-Id"),
      request.headers.get("X-Waitless-User-Agent"),
    );

    let trusted = false;
    if (device) {
      try {
        trusted = await isPlatformDeviceTrusted(db, decoded.uid, device);
      } catch (err) {
        console.warn("[platform/auth/start] trusted device check skipped:", err);
      }
    }

    if (trusted) {
      const adminEmail = getPlatformAdminEmail();
      return issueSession(request, decoded.uid, adminEmail, true);
    }

    const { challengeId } = await createPlatformLoginOtp(db, decoded.uid, meta);

    return NextResponse.json({
      requiresOtp: true,
      challengeId,
      email: getPlatformAdminEmail(),
    });
  } catch (error) {
    if (error instanceof PlatformAuthError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    const mapped = mapStartError(error);
    console.error("[platform/auth/start]", error);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }
}
