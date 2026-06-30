export function isAsaasConfigured(): boolean {
  return Boolean(process.env.ASAAS_API_KEY?.trim());
}

export function isAsaasPixEnabled(): boolean {
  if (!isAsaasConfigured()) return false;
  const value = process.env.ASAAS_PIX_ENABLED?.trim().toLowerCase();
  if (value === "0" || value === "false" || value === "no") return false;
  return true;
}

export function getAsaasApiBaseUrl(): string {
  const sandbox = process.env.ASAAS_SANDBOX?.trim().toLowerCase();
  const useSandbox = sandbox === "1" || sandbox === "true" || sandbox === "yes";
  return useSandbox ? "https://api-sandbox.asaas.com/v3" : "https://api.asaas.com/v3";
}

export function isAsaasSandbox(): boolean {
  const sandbox = process.env.ASAAS_SANDBOX?.trim().toLowerCase();
  return sandbox === "1" || sandbox === "true" || sandbox === "yes";
}

export function buildAsaasExternalReference(input: {
  companyId: string;
  planId: string;
  interval: string;
}): string {
  return `waitless:${input.companyId}:${input.planId}:${input.interval}`;
}

export function parseAsaasExternalReference(
  ref: string | undefined | null,
): { companyId: string; planId: string; interval: string } | null {
  if (!ref) return null;
  const parts = ref.split(":");
  if (parts.length !== 4 || parts[0] !== "waitless") return null;
  const [, companyId, planId, interval] = parts;
  if (!companyId || !planId || !interval) return null;
  return { companyId, planId, interval };
}
