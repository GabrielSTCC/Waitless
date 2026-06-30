import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, isCredentialError } from "@/lib/firebase/admin";
import { isNextResponse, verifyPlatformRequest } from "@/lib/platform/api-auth";
import { computePlatformStats } from "@/lib/platform/stats";

export async function GET(request: NextRequest) {
  const authResult = await verifyPlatformRequest(request);
  if (isNextResponse(authResult)) return authResult;

  try {
    const db = getAdminDb();
    const stats = await computePlatformStats(db);
    return NextResponse.json(stats);
  } catch (error) {
    if (isCredentialError(error)) {
      return NextResponse.json({ error: "Credenciais Firebase indisponíveis." }, { status: 503 });
    }
    console.error("[platform/stats]", error);
    return NextResponse.json({ error: "Erro ao carregar estatísticas." }, { status: 500 });
  }
}
