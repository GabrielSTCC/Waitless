import type { BillingInterval } from "@/lib/billing/plans";
import { getAsaasApiBaseUrl } from "@/lib/billing/asaas/config";

export class AsaasApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = "AsaasApiError";
  }
}

type AsaasCycle = "WEEKLY" | "MONTHLY" | "YEARLY";

export interface AsaasCustomer {
  id: string;
  name: string;
  email: string;
  cpfCnpj?: string;
}

export interface AsaasSubscription {
  id: string;
  customer: string;
  billingType: string;
  cycle: AsaasCycle;
  value: number;
  nextDueDate: string;
  status: string;
  externalReference?: string;
}

export interface AsaasPayment {
  id: string;
  customer: string;
  subscription?: string;
  status: string;
  billingType: string;
  value: number;
  dueDate: string;
  externalReference?: string;
}

export interface AsaasPixQrCode {
  encodedImage: string;
  payload: string;
  expirationDate: string;
}

function getApiKey(): string {
  const key = process.env.ASAAS_API_KEY?.trim();
  if (!key) throw new Error("ASAAS_API_KEY não configurada.");
  return key;
}

async function asaasRequest<T>(
  path: string,
  init?: RequestInit & { searchParams?: Record<string, string> },
): Promise<T> {
  const base = getAsaasApiBaseUrl();
  const url = new URL(`${base}${path}`);
  if (init?.searchParams) {
    for (const [key, value] of Object.entries(init.searchParams)) {
      url.searchParams.set(key, value);
    }
  }

  const { searchParams: _ignored, ...fetchInit } = init ?? {};
  const response = await fetch(url, {
    ...fetchInit,
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      access_token: getApiKey(),
      ...(fetchInit.headers ?? {}),
    },
  });

  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    const errors = body.errors as Array<{ description?: string }> | undefined;
    const detail = errors?.[0]?.description ?? JSON.stringify(body);
    throw new AsaasApiError(detail || `Asaas HTTP ${response.status}`, response.status, body);
  }

  return body as T;
}

export function mapIntervalToAsaasCycle(interval: BillingInterval): AsaasCycle {
  switch (interval) {
    case "week":
      return "WEEKLY";
    case "year":
      return "YEARLY";
    default:
      return "MONTHLY";
  }
}

export function formatAsaasDate(date: Date): string {
  return date.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

export function addBillingPeriod(dueDate: string, interval: BillingInterval): Date {
  const base = new Date(`${dueDate}T12:00:00`);
  const next = new Date(base);
  if (interval === "week") {
    next.setDate(next.getDate() + 7);
  } else if (interval === "year") {
    next.setFullYear(next.getFullYear() + 1);
  } else {
    next.setMonth(next.getMonth() + 1);
  }
  return next;
}

export async function findAsaasCustomerByEmail(email: string): Promise<AsaasCustomer | null> {
  const result = await asaasRequest<{ data: AsaasCustomer[] }>("/customers", {
    searchParams: { email },
  });
  return result.data[0] ?? null;
}

export async function getAsaasCustomer(customerId: string): Promise<AsaasCustomer | null> {
  try {
    return await asaasRequest<AsaasCustomer>(`/customers/${customerId}`);
  } catch (error) {
    if (error instanceof AsaasApiError && (error.status === 404 || error.status === 400)) {
      return null;
    }
    throw error;
  }
}

export function isInvalidCustomerError(error: unknown): boolean {
  if (!(error instanceof AsaasApiError)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("cliente inválido") ||
    message.includes("cliente invalido") ||
    message.includes("não informado") ||
    message.includes("nao informado") ||
    message.includes("customer")
  );
}

export async function resolveAsaasCustomerId(input: {
  storedCustomerId?: string;
  name: string;
  email: string;
  cpfCnpj: string;
  externalReference: string;
}): Promise<string> {
  if (input.storedCustomerId) {
    const stored = await getAsaasCustomer(input.storedCustomerId);
    if (stored) return stored.id;
  }

  const existing = await findAsaasCustomerByEmail(input.email);
  if (existing) return existing.id;

  const customer = await createAsaasCustomer({
    name: input.name,
    email: input.email,
    cpfCnpj: input.cpfCnpj,
    externalReference: input.externalReference,
  });
  return customer.id;
}

export async function createAsaasCustomer(input: {
  name: string;
  email: string;
  cpfCnpj: string;
  externalReference: string;
}): Promise<AsaasCustomer> {
  return asaasRequest<AsaasCustomer>("/customers", {
    method: "POST",
    body: JSON.stringify({
      name: input.name,
      email: input.email,
      cpfCnpj: input.cpfCnpj.replace(/\D/g, ""),
      externalReference: input.externalReference,
      notificationDisabled: false,
    }),
  });
}

export async function createAsaasSubscription(input: {
  customerId: string;
  value: number;
  cycle: AsaasCycle;
  nextDueDate: string;
  description: string;
  externalReference: string;
}): Promise<AsaasSubscription> {
  return asaasRequest<AsaasSubscription>("/subscriptions", {
    method: "POST",
    body: JSON.stringify({
      customer: input.customerId,
      billingType: "PIX",
      value: input.value,
      cycle: input.cycle,
      nextDueDate: input.nextDueDate,
      description: input.description,
      externalReference: input.externalReference,
    }),
  });
}

export async function cancelAsaasSubscription(subscriptionId: string): Promise<void> {
  await asaasRequest(`/subscriptions/${subscriptionId}`, { method: "DELETE" });
}

export async function listSubscriptionPayments(subscriptionId: string): Promise<AsaasPayment[]> {
  const result = await asaasRequest<{ data: AsaasPayment[] }>(
    `/subscriptions/${subscriptionId}/payments`,
  );
  return result.data;
}

export async function getAsaasPayment(paymentId: string): Promise<AsaasPayment> {
  return asaasRequest<AsaasPayment>(`/payments/${paymentId}`);
}

export async function getAsaasPixQrCode(paymentId: string): Promise<AsaasPixQrCode> {
  return asaasRequest<AsaasPixQrCode>(`/payments/${paymentId}/pixQrCode`);
}

export interface AsaasPixAddressKey {
  id: string;
  type: string;
  status: string;
}

export async function listAsaasPixAddressKeys(): Promise<AsaasPixAddressKey[]> {
  const result = await asaasRequest<{ data: AsaasPixAddressKey[] }>("/pix/addressKeys");
  return result.data;
}

export async function createAsaasPixAddressKey(): Promise<AsaasPixAddressKey> {
  return asaasRequest<AsaasPixAddressKey>("/pix/addressKeys", {
    method: "POST",
    body: JSON.stringify({ type: "EVP" }),
  });
}

/** Cadastra chave Pix aleatória (EVP) se a conta ainda não tiver nenhuma. */
export async function ensureAsaasPixAddressKey(): Promise<void> {
  const keys = await listAsaasPixAddressKeys();
  const active = keys.filter((key) => key.status !== "DELETED");
  if (active.length > 0) return;
  await createAsaasPixAddressKey();
}

/** Sandbox: simula pagamento de QR Code Pix (não funciona em bancos reais). */
export async function simulateAsaasPixQrCodePayment(
  payload: string,
  value: number,
): Promise<void> {
  await asaasRequest("/pix/qrCodes/pay", {
    method: "POST",
    body: JSON.stringify({
      qrCode: { payload: payload.trim() },
      value,
    }),
  });
}

export function formatAsaasPixSetupError(message: string): string {
  if (
    message.toLowerCase().includes("chave pix") ||
    message.toLowerCase().includes("pix cadastrada")
  ) {
    return `${message} Cadastre uma chave em Asaas → Pix → Minhas chaves (ou rode: npm run setup:asaas-pix).`;
  }
  return message;
}
