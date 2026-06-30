import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { auth } from "@/lib/firebase/config";
import { getDeviceHeaders } from "@/lib/auth/device-id";

const PENDING_KEY = "waitless-2fa-pending";
const REASON_KEY = "waitless-2fa-reason";

export const TWO_FACTOR_PENDING_EVENT = "waitless-2fa-pending-change";

export type TwoFactorReason = "new_device" | "failed_attempts";

function notifyTwoFactorPendingChange(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(TWO_FACTOR_PENDING_EVENT));
}

export function setTwoFactorPending(
  uid: string,
  reason?: TwoFactorReason,
): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(PENDING_KEY, uid);
  if (reason) {
    sessionStorage.setItem(REASON_KEY, reason);
  } else {
    sessionStorage.removeItem(REASON_KEY);
  }
  notifyTwoFactorPendingChange();
}

export function getTwoFactorReason(): TwoFactorReason | undefined {
  if (typeof window === "undefined") return undefined;
  const value = sessionStorage.getItem(REASON_KEY);
  if (value === "new_device" || value === "failed_attempts") return value;
  return undefined;
}

export function clearTwoFactorPending(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(PENDING_KEY);
  sessionStorage.removeItem(REASON_KEY);
  notifyTwoFactorPendingChange();
}

export function isTwoFactorPending(uid?: string | null): boolean {
  if (typeof window === "undefined" || !uid) return false;
  return sessionStorage.getItem(PENDING_KEY) === uid;
}

async function getAuthHeaders(
  forceRefresh = false,
): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) throw new Error("Não autenticado.");
  const token = await user.getIdToken(forceRefresh);
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    ...getDeviceHeaders(),
  };
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => ({}))) as T & {
    error?: string;
  };
  if (!response.ok) {
    throw new Error(getAuthApiErrorMessage(response, data));
  }
  return data;
}

function getAuthApiErrorMessage(
  response: Response,
  data: { error?: unknown },
): string {
  if (typeof data.error === "string" && data.error.trim()) {
    return data.error;
  }
  if (response.status === 401) return "Não autenticado.";
  if (response.status === 404) return "Membro não encontrado.";
  if (response.status >= 500) {
    return "Erro no servidor ao processar a solicitação. Tente novamente em instantes.";
  }
  return response.statusText || "Falha na requisição.";
}

export function isInvalidCredentialError(error: unknown): boolean {
  const code = (error as { code?: string })?.code;
  return (
    code === "auth/wrong-password" ||
    code === "auth/invalid-credential" ||
    code === "auth/user-not-found"
  );
}

/** Avalia 2FA após qualquer login (e-mail/senha ou Google) e redireciona se necessário. */
export async function completeLoginFlow(
  router: AppRouterInstance,
  onSuccess: () => void | Promise<void>,
): Promise<void> {
  const evaluation = await evaluateTwoFactor();
  const uid = auth.currentUser?.uid;

  if (evaluation.required && uid) {
    setTwoFactorPending(uid, evaluation.reason);
    router.replace("/admin/auth/verify-2fa");
    return;
  }

  await onSuccess();
}

/** @deprecated Use completeLoginFlow */
export const completePasswordLoginFlow = completeLoginFlow;

export async function reportLoginFailed(email: string): Promise<void> {
  await fetch("/api/auth/login-failed", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getDeviceHeaders() },
    body: JSON.stringify({ email }),
  }).catch(() => undefined);
}

export async function evaluateTwoFactor(): Promise<{
  required: boolean;
  reason?: "new_device" | "failed_attempts";
}> {
  const headers = await getAuthHeaders();
  const response = await fetch("/api/auth/2fa/evaluate", {
    method: "POST",
    headers,
    body: JSON.stringify({}),
  });
  return parseJsonResponse(response);
}

export async function sendTwoFactorCode(
  purpose: "login" | "enable" = "login",
): Promise<{ challengeId: string }> {
  const headers = await getAuthHeaders();
  const response = await fetch("/api/auth/2fa/send", {
    method: "POST",
    headers,
    body: JSON.stringify({ purpose }),
  });
  return parseJsonResponse(response);
}

export async function verifyTwoFactorCode(input: {
  challengeId: string;
  code: string;
  trustDevice: boolean;
}): Promise<void> {
  const headers = await getAuthHeaders();
  const response = await fetch("/api/auth/2fa/verify", {
    method: "POST",
    headers,
    body: JSON.stringify(input),
  });
  await parseJsonResponse(response);
  clearTwoFactorPending();
}

export async function startEnableTwoFactor(): Promise<{ challengeId: string }> {
  const headers = await getAuthHeaders(true);
  const response = await fetch("/api/auth/2fa/enable", {
    method: "POST",
    headers,
    body: JSON.stringify({}),
  });
  return parseJsonResponse(response);
}

export async function confirmEnableTwoFactor(input: {
  challengeId: string;
  code: string;
  trustDevice: boolean;
}): Promise<void> {
  const headers = await getAuthHeaders(true);
  const response = await fetch("/api/auth/2fa/enable", {
    method: "POST",
    headers,
    body: JSON.stringify(input),
  });
  await parseJsonResponse(response);
}

export async function disableTwoFactor(): Promise<void> {
  const headers = await getAuthHeaders(true);
  const response = await fetch("/api/auth/2fa/disable", {
    method: "POST",
    headers,
    body: JSON.stringify({}),
  });
  await parseJsonResponse(response);
}

export async function fetchTrustedDevices(): Promise<
  Array<{
    id: string;
    label: string;
    createdAt: string;
    lastUsedAt: string;
    expiresAt: string;
  }>
> {
  const headers = await getAuthHeaders();
  const response = await fetch("/api/auth/2fa/devices", { headers });
  const data = await parseJsonResponse<{ devices: Array<{
    id: string;
    label: string;
    createdAt: string;
    lastUsedAt: string;
    expiresAt: string;
  }> }>(response);
  return data.devices;
}

export async function revokeTrustedDevice(deviceId: string): Promise<void> {
  const headers = await getAuthHeaders(true);
  const response = await fetch("/api/auth/2fa/devices", {
    method: "DELETE",
    headers,
    body: JSON.stringify({ deviceId }),
  });
  await parseJsonResponse(response);
}
