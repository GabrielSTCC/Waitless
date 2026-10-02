/**
 * Structured server logs with optional companyId for multi-tenant ops (Fase 2+).
 * Avoid putting WhatsApp, tokens or passwords in `fields`.
 */

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
