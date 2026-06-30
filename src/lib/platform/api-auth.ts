import { NextRequest, NextResponse } from "next/server";
import type { DecodedIdToken } from "firebase-admin/auth";
import {
  CREDENTIAL_SETUP_MESSAGE,
  getAdminAuth,
  isCredentialError,
} from "@/lib/firebase/admin";
import { sendPlatformAlert } from "@/lib/email/send-platform-alert";
import { assertPlatformAdmin, PlatformAuthError } from "@/lib/platform/auth";
import { getRequestMeta } from "@/lib/platform/request-meta";
import {
  verifyPlatformSessionFromRequest,
  type PlatformSessionPayload,
} from "@/lib/platform/session";

export type PlatformAuthContext = PlatformSessionPayload;

export async function verifyPlatformRequest(
  request: NextRequest,
): Promise<PlatformAuthContext | NextResponse> {
  const session = await verifyPlatformSessionFromRequest(request);
  if (session) {
    return session;
  }

  const authHeader = request.headers.get("Authorization");
  const idToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (!idToken) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  try {
    const decoded = await getAdminAuth().verifyIdToken(idToken);
    assertPlatformAdmin(decoded);
    const meta = getRequestMeta(request);
    await sendPlatformAlert("access_denied", meta).catch(() => undefined);
    return NextResponse.json(
      { error: "Sessão da plataforma inválida. Faça login novamente." },
      { status: 401 },
    );
  } catch (error) {
    if (error instanceof PlatformAuthError) {
      const meta = getRequestMeta(request);
      await sendPlatformAlert("access_denied", meta).catch(() => undefined);
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (isCredentialError(error)) {
      return NextResponse.json(
        { error: CREDENTIAL_SETUP_MESSAGE },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: "Token inválido." }, { status: 401 });
  }
}

export function isNextResponse(value: unknown): value is NextResponse {
  return value instanceof NextResponse;
}

export function platformAuthToDecoded(
  ctx: PlatformAuthContext,
): Pick<DecodedIdToken, "uid" | "email"> {
  return { uid: ctx.uid, email: ctx.email };
}
