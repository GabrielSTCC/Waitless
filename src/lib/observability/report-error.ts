/**
 * Optional Sentry reporting via Store API (no @sentry/nextjs dependency).
 * Set SENTRY_DSN on the server to enable. Never log secrets or full PII.
 */

import { recordTenantEvent } from "@/lib/observability/tenant-log";

type ReportContext = {
  route?: string;
  companyId?: string;
  tags?: Record<string, string>;
  extra?: Record<string, string | number | boolean | undefined>;
};

function parseDsn(dsn: string): {
  publicKey: string;
  host: string;
  projectId: string;
} | null {
  try {
    const url = new URL(dsn);
    const publicKey = url.username;
    const projectId = url.pathname.replace(/^\//, "").split("/")[0] ?? "";
    if (!publicKey || !projectId || !url.host) return null;
    return { publicKey, host: url.host, projectId };
  } catch {
    return null;
  }
}

export async function reportError(
  error: unknown,
  context: ReportContext = {},
): Promise<void> {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "Unknown error";

  if (context.companyId && context.route) {
    void recordTenantEvent({
      companyId: context.companyId,
      route: context.route,
      level: "error",
      kind: "exception",
      message,
      meta: context.extra,
    });
  }

  const dsn = process.env.SENTRY_DSN?.trim();
  if (!dsn) return;

  const parsed = parseDsn(dsn);
  if (!parsed) return;

  const stack = error instanceof Error ? error.stack : undefined;
  const environment =
    process.env.SENTRY_ENVIRONMENT?.trim() ||
    process.env.VERCEL_ENV ||
    process.env.NODE_ENV ||
    "production";

  const event = {
    event_id: crypto.randomUUID().replace(/-/g, ""),
    timestamp: Date.now() / 1000,
    platform: "node",
    level: "error",
    environment,
    server_name: process.env.VERCEL_REGION || "server",
    message,
    exception: stack
      ? {
          values: [
            {
              type: error instanceof Error ? error.name : "Error",
              value: message,
              stacktrace: { frames: [{ filename: "app", function: message }] },
            },
          ],
        }
      : undefined,
    tags: {
      ...(context.route ? { route: context.route } : {}),
      ...(context.companyId ? { companyId: context.companyId } : {}),
      ...context.tags,
    },
    extra: context.extra,
  };

  const storeUrl = `https://${parsed.host}/api/${parsed.projectId}/store/`;
  try {
    await fetch(storeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Sentry-Auth": `Sentry sentry_version=7, sentry_key=${parsed.publicKey}, sentry_client=waitless/1.0`,
      },
      body: JSON.stringify(event),
      cache: "no-store",
    });
  } catch {
    // never throw from reporter
  }
}
