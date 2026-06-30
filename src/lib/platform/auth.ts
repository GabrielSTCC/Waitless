import type { DecodedIdToken } from "firebase-admin/auth";

export function getPlatformAdminEmail(): string {
  const email = process.env.PLATFORM_ADMIN_EMAIL?.trim().toLowerCase();
  if (!email) {
    throw new Error("PLATFORM_ADMIN_EMAIL não configurado.");
  }
  return email;
}

export class PlatformAuthError extends Error {
  constructor(message = "Acesso negado ao painel da plataforma.") {
    super(message);
    this.name = "PlatformAuthError";
  }
}

export function isAuthorizedPlatformEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  try {
    return email.trim().toLowerCase() === getPlatformAdminEmail();
  } catch {
    return false;
  }
}

export function isPlatformAdmin(decoded: DecodedIdToken): boolean {
  const email = (decoded.email ?? "").trim().toLowerCase();
  try {
    return decoded.platformAdmin === true && email === getPlatformAdminEmail();
  } catch {
    return false;
  }
}

export function assertPlatformAdmin(decoded: DecodedIdToken): void {
  if (!isPlatformAdmin(decoded)) {
    throw new PlatformAuthError();
  }
}

export async function isPlatformAdminClient(
  getIdTokenResult: () => Promise<{ claims: Record<string, unknown> }>,
): Promise<boolean> {
  const result = await getIdTokenResult();
  return result.claims.platformAdmin === true;
}
