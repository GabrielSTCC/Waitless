import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb, isCredentialError } from "@/lib/firebase/admin";
import { isNextResponse, verifyPlatformRequest } from "@/lib/platform/api-auth";
import { listCompanies } from "@/lib/platform/companies";
import type { PlatformControlStatus, SubscriptionStatus } from "@/lib/types";

export async function GET(request: NextRequest) {
  const authResult = await verifyPlatformRequest(request);
  if (isNextResponse(authResult)) return authResult;

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") ?? undefined;
    const subscriptionStatus = searchParams.get("subscriptionStatus") as
      | SubscriptionStatus
      | null;
    const platformStatus = searchParams.get("platformStatus") as
      | PlatformControlStatus
      | "past_due"
      | null;
    const plan = searchParams.get("plan") ?? undefined;
    const page = Number(searchParams.get("page") ?? "1");
    const pageSize = Number(searchParams.get("pageSize") ?? "20");

    const db = getAdminDb();
    const auth = getAdminAuth();
    const result = await listCompanies(db, auth, {
      search,
      subscriptionStatus: subscriptionStatus ?? undefined,
      platformStatus: platformStatus ?? undefined,
      plan,
      page: Number.isFinite(page) ? page : 1,
      pageSize: Number.isFinite(pageSize) ? pageSize : 20,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (isCredentialError(error)) {
      return NextResponse.json({ error: "Credenciais Firebase indisponíveis." }, { status: 503 });
    }
    console.error("[platform/companies]", error);
    return NextResponse.json({ error: "Erro ao listar empresas." }, { status: 500 });
  }
}
