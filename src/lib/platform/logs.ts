import {
  type DocumentData,
  type Query,
} from "firebase-admin/firestore";
import { getAdminDb, isCredentialError } from "@/lib/firebase/admin";
import {
  TENANT_ROUTE_EVENTS_COLLECTION,
  TENANT_ROUTE_EVENTS_LIST_LIMIT,
  type TenantRouteEvent,
  type TenantRouteEventKind,
  type TenantRouteEventLevel,
} from "@/lib/observability/tenant-route-events";

function toIso(value: unknown): string {
  if (!value) return new Date(0).toISOString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && value !== null && "toDate" in value) {
    try {
      return (value as { toDate: () => Date }).toDate().toISOString();
    } catch {
      return new Date(0).toISOString();
    }
  }
  if (typeof value === "string") return value;
  return new Date(0).toISOString();
}

function mapEvent(id: string, data: DocumentData | undefined): TenantRouteEvent {
  const level: TenantRouteEventLevel = data?.level === "warn" ? "warn" : "error";
  const kind = (data?.kind as TenantRouteEventKind) || "ops";
  return {
    id,
    companyId: typeof data?.companyId === "string" ? data.companyId : "",
    companyName:
      typeof data?.companyName === "string" && data.companyName
        ? data.companyName
        : undefined,
    route: typeof data?.route === "string" ? data.route : "",
    level,
    kind,
    message: typeof data?.message === "string" ? data.message : "",
    statusCode: typeof data?.statusCode === "number" ? data.statusCode : undefined,
    meta:
      data?.meta && typeof data.meta === "object"
        ? (data.meta as TenantRouteEvent["meta"])
        : undefined,
    createdAt: toIso(data?.createdAt),
  };
}

export async function listTenantRouteEvents(filters: {
  companyId?: string;
  level?: TenantRouteEventLevel;
  kind?: TenantRouteEventKind;
  page?: number;
  pageSize?: number;
}): Promise<{ entries: TenantRouteEvent[]; total: number; page: number; pageSize: number }> {
  const page = Math.max(filters.page ?? 1, 1);
  const pageSize = Math.min(Math.max(filters.pageSize ?? 30, 1), 100);
  const db = getAdminDb();

  let query: Query = db
    .collection(TENANT_ROUTE_EVENTS_COLLECTION)
    .orderBy("createdAt", "desc")
    .limit(TENANT_ROUTE_EVENTS_LIST_LIMIT);

  if (filters.companyId) {
    query = db
      .collection(TENANT_ROUTE_EVENTS_COLLECTION)
      .where("companyId", "==", filters.companyId)
      .orderBy("createdAt", "desc")
      .limit(TENANT_ROUTE_EVENTS_LIST_LIMIT);
  }

  try {
    const snap = await query.get();
    let entries = snap.docs.map((doc) => mapEvent(doc.id, doc.data()));

    if (filters.level) {
      entries = entries.filter((e) => e.level === filters.level);
    }
    if (filters.kind) {
      entries = entries.filter((e) => e.kind === filters.kind);
    }

    const total = entries.length;
    const start = (page - 1) * pageSize;
    return {
      entries: entries.slice(start, start + pageSize),
      total,
      page,
      pageSize,
    };
  } catch (error) {
    if (isCredentialError(error)) throw error;
    throw error;
  }
}
