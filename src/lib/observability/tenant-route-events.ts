export type TenantRouteEventLevel = "error" | "warn";

export type TenantRouteEventKind =
  | "exception"
  | "rate_limit"
  | "queue_blocked"
  | "trial_expired"
  | "billing_failed"
  | "ops";

export type TenantRouteEventMeta = Record<
  string,
  string | number | boolean | undefined | null
>;

export interface TenantRouteEventInput {
  companyId?: string;
  companyName?: string;
  route: string;
  level: TenantRouteEventLevel;
  kind: TenantRouteEventKind;
  message: string;
  statusCode?: number;
  meta?: TenantRouteEventMeta;
}

export interface TenantRouteEvent {
  id: string;
  companyId: string;
  companyName?: string;
  route: string;
  level: TenantRouteEventLevel;
  kind: TenantRouteEventKind;
  message: string;
  statusCode?: number;
  meta?: TenantRouteEventMeta;
  createdAt: string;
}

export const TENANT_ROUTE_EVENTS_COLLECTION = "tenantRouteEvents";
export const TENANT_ROUTE_EVENTS_LIST_LIMIT = 200;
