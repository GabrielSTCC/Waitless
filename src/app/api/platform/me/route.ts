import { NextRequest, NextResponse } from "next/server";
import { isNextResponse, verifyPlatformRequest } from "@/lib/platform/api-auth";

export async function GET(request: NextRequest) {
  const authResult = await verifyPlatformRequest(request);
  if (isNextResponse(authResult)) return authResult;

  return NextResponse.json({
    ok: true,
    uid: authResult.uid,
    email: authResult.email ?? null,
    platformAdmin: true,
  });
}
