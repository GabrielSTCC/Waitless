import { auth } from "@/lib/firebase/config";
import type { BillingInterval, PaidPlanTier } from "@/lib/billing/plans";

export interface PixCheckoutData {
  paymentId: string;
  encodedImage: string;
  payload: string;
  expirationDate: string;
  value: number;
  currency: "BRL" | "USD";
  sandboxMode?: boolean;
}

async function billingFetch<T>(
  path: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const user = auth.currentUser;
  if (!user) throw new Error("Não autenticado.");

  const idToken = await user.getIdToken();
  const response = await fetch(path, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = (await response.json().catch(() => ({}))) as T & { error?: string };

  if (!response.ok) {
    throw new Error(data.error ?? "Falha na operação de billing.");
  }

  return data;
}

export async function startCheckoutSession(input: {
  planId: PaidPlanTier;
  interval: BillingInterval;
}): Promise<void> {
  const data = await billingFetch<{ url?: string }>("/api/billing/checkout", input);
  if (!data.url) throw new Error("URL de redirecionamento indisponível.");
  window.location.assign(data.url);
}

export async function startPixCheckoutSession(input: {
  planId: PaidPlanTier;
  interval: BillingInterval;
  cpfCnpj?: string;
}): Promise<PixCheckoutData> {
  const data = await billingFetch<{ pix?: PixCheckoutData }>("/api/billing/pix/checkout", input);
  if (!data.pix) throw new Error("Dados do PIX indisponíveis.");
  return data.pix;
}

export async function simulateSandboxPixPayment(paymentId: string): Promise<void> {
  await billingFetch("/api/billing/pix/simulate", { paymentId });
}

export async function openBillingPortal(): Promise<void> {
  const data = await billingFetch<{ url?: string }>("/api/billing/portal");
  if (!data.url) throw new Error("URL de redirecionamento indisponível.");
  window.location.assign(data.url);
}

export function isPixBillingEnabled(): boolean {
  return process.env.NEXT_PUBLIC_BILLING_PIX_ENABLED === "true";
}
