import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { verifyAppCheckTokenServer } from "@/lib/firebase/app-check-server";
import {
  CREDENTIAL_SETUP_MESSAGE,
  isCredentialError,
} from "@/lib/firebase/admin";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult instanceof Response) return authResult;

    const body = (await request.json()) as { appCheckToken?: string };
    const appCheckToken = body.appCheckToken?.trim();
    if (!appCheckToken) {
      return NextResponse.json({ error: "appCheckToken é obrigatório." }, { status: 400 });
    }

    const result = await verifyAppCheckTokenServer(appCheckToken);
    const expectedAppId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;

    if (!result.valid) {
      return NextResponse.json({
        valid: false,
        expectedAppId,
        error: result.error,
      });
    }

    return NextResponse.json({
      valid: true,
      appId: result.appId,
      expectedAppId,
      appIdMatches: !expectedAppId || result.appId === expectedAppId,
    });
  } catch (error) {
    if (isCredentialError(error)) {
      return NextResponse.json({ error: CREDENTIAL_SETUP_MESSAGE }, { status: 503 });
    }

    console.error("[admin/app-check-verify]", error);
    return NextResponse.json({ error: "Erro ao verificar App Check." }, { status: 500 });
  }
}
