import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import {
  CREDENTIAL_SETUP_MESSAGE,
  isCredentialError,
} from "@/lib/firebase/admin";
import { probeFirestoreMemberRest } from "@/lib/firebase/firestore-rest-probe-server";

export const runtime = "nodejs";

function decodeIdTokenAud(idToken: string): string | null {
  try {
    const payload = idToken.split(".")[1];
    if (!payload) return null;
    const decoded = JSON.parse(
      Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"),
    ) as { aud?: string };
    return decoded.aud ?? null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult instanceof Response) return authResult;

    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (!projectId) {
      return NextResponse.json(
        { error: "NEXT_PUBLIC_FIREBASE_PROJECT_ID ausente." },
        { status: 500 },
      );
    }

    const authHeader = request.headers.get("Authorization");
    const idToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!idToken) {
      return NextResponse.json({ error: "Token de autenticação ausente." }, { status: 401 });
    }

    const idTokenAud = decodeIdTokenAud(idToken);
    const body = (await request.json()) as { appCheckToken?: string };
    const appCheckToken = body.appCheckToken?.trim() || null;

    const withBoth = await probeFirestoreMemberRest(
      projectId,
      authResult.uid,
      idToken,
      appCheckToken,
    );

    const authOnly = await probeFirestoreMemberRest(
      projectId,
      authResult.uid,
      idToken,
      null,
    );

    return NextResponse.json({
      restOk: withBoth.restOk,
      memberExists: withBoth.memberExists,
      permissionDenied: withBoth.permissionDenied,
      testedAuth: withBoth.testedAuth,
      testedAppCheck: withBoth.testedAppCheck,
      status: withBoth.status,
      error: withBoth.error,
      authOnlyOk: authOnly.restOk,
      authOnlyStatus: authOnly.status,
      authOnlyPermissionDenied: authOnly.permissionDenied,
      authOnlyMemberExists: authOnly.memberExists,
      projectIdUsed: projectId,
      idTokenAud,
      projectIdMatchesAud: !idTokenAud || idTokenAud === projectId,
    });
  } catch (error) {
    if (isCredentialError(error)) {
      return NextResponse.json({ error: CREDENTIAL_SETUP_MESSAGE }, { status: 503 });
    }

    console.error("[admin/firestore-probe]", error);
    return NextResponse.json({ error: "Erro ao sondar Firestore REST." }, { status: 500 });
  }
}
