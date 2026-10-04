import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, isCredentialError } from "@/lib/firebase/admin";
import { isNextResponse, verifyPlatformRequest } from "@/lib/platform/api-auth";
import { listTenantRouteEvents } from "@/lib/platform/logs";
import type {
  TenantRouteEventKind,
  TenantRouteEventLevel,
} from "@/lib/observability/tenant-route-events";

const LEVELS = new Set<TenantRouteEventLevel>(["error", "warn"]);
const KINDS = new Set<TenantRouteEventKind>([
  "exception",
  "rate_limit",
  "queue_blocked",
  "trial_expired",
  "billing_failed",
  "ops",
]);

export async function GET(request: NextRequest) {
  const authResult = await verifyPlatformRequest(request);
  if (isNextResponse(authResult)) return authResult;

  try {
    getAdminDb();
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId")?.trim() || undefined;
    const levelRaw = searchParams.get("level")?.trim();
    const kindRaw = searchParams.get("kind")?.trim();
    const page = Math.max(Number(searchParams.get("page") ?? "1"), 1);
    const pageSize = Math.min(Number(searchParams.get("pageSize") ?? "30"), 100);

    const level =
      levelRaw && LEVELS.has(levelRaw as TenantRouteEventLevel)
        ? (levelRaw as TenantRouteEventLevel)
        : undefined;
    const kind =
      kindRaw && KINDS.has(kindRaw as TenantRouteEventKind)
        ? (kindRaw as TenantRouteEventKind)
        : undefined;

    const result = await listTenantRouteEvents({
      companyId,
      level,
      kind,
      page,
      pageSize,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (isCredentialError(error)) {
      return NextResponse.json({ error: "Credenciais Firebase indisponíveis." }, { status: 503 });
    }
    console.error("[platform/logs]", error);
    return NextResponse.json({ error: "Erro ao carregar logs." }, { status: 500 });
  }
}
