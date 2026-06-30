import { NextRequest, NextResponse } from "next/server";
import {
  clearPlatformSessionCookie,
  verifyPlatformSessionFromRequest,
} from "@/lib/platform/session";

export async function GET(request: NextRequest) {
  const session = await verifyPlatformSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    uid: session.uid,
    email: session.email,
  });
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  clearPlatformSessionCookie(response);
  return response;
}
