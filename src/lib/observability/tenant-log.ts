/**
 * Structured server logs with optional companyId for multi-tenant ops (Fase 2+).
 * Avoid putting WhatsApp, tokens or passwords in `fields`.
 */

import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb, isCredentialError } from "@/lib/firebase/admin";
import {
  TENANT_ROUTE_EVENTS_COLLECTION,
  type TenantRouteEventInput,
} from "@/lib/observability/tenant-route-events";

type LogFields = Record<string, string | number | boolean | undefined | null>;

function serialize(
  level: string,
  message: string,
  companyId: string | undefined,
  fields?: LogFields,
): string {
  return JSON.stringify({
    level,
    message,
    companyId: companyId || undefined,
    ts: new Date().toISOString(),
    ...fields,
  });
}

export function tenantInfo(
  companyId: string | undefined,
  message: string,
  fields?: LogFields,
): void {
  console.info(serialize("info", message, companyId, fields));
}

export function tenantWarn(
  companyId: string | undefined,
  message: string,
  fields?: LogFields,
): void {
  console.warn(serialize("warn", message, companyId, fields));
}

export function tenantError(
  companyId: string | undefined,
  message: string,
  fields?: LogFields,
): void {
  console.error(serialize("error", message, companyId, fields));
}

function sanitizeMeta(
  meta: TenantRouteEventInput["meta"] | undefined,
): Record<string, string | number | boolean | null> | null {
  if (!meta) return null;
  const out: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(meta)) {
    if (value === undefined) continue;
    const lower = key.toLowerCase();
    if (
      lower.includes("whatsapp") ||
      lower.includes("password") ||
      lower.includes("token") ||
      lower.includes("secret") ||
      lower.includes("authorization")
    ) {
      continue;
    }
    out[key] = value;
  }
  return Object.keys(out).length > 0 ? out : null;
}

/**
 * Persist a subscriber-route problem for /platform/logs.
 * Fire-and-forget: never throws to callers.
 */
export async function recordTenantEvent(input: TenantRouteEventInput): Promise<void> {
  const companyId = input.companyId?.trim();
  if (!companyId) return;

  const message = input.message.trim().slice(0, 500);
  if (!message) return;

  const route = input.route.trim().slice(0, 200);
  if (!route) return;

  try {
    const db = getAdminDb();
    await db.collection(TENANT_ROUTE_EVENTS_COLLECTION).add({
      companyId,
      companyName: input.companyName?.trim().slice(0, 200) || null,
      route,
      level: input.level,
      kind: input.kind,
      message,
      statusCode: typeof input.statusCode === "number" ? input.statusCode : null,
      meta: sanitizeMeta(input.meta),
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    if (isCredentialError(error)) {
      console.error("[tenantRouteEvents] credentials unavailable");
      return;
    }
    console.error("[tenantRouteEvents] write failed", error);
  }

  if (input.level === "error") {
    tenantError(companyId, message, {
      route,
      kind: input.kind,
      statusCode: input.statusCode,
    });
  } else {
    tenantWarn(companyId, message, {
      route,
      kind: input.kind,
      statusCode: input.statusCode,
    });
  }
}
