import { NextRequest } from "next/server";
import {
  CREDENTIAL_SETUP_MESSAGE,
  getAdminAuth,
  isCredentialError,
} from "@/lib/firebase/admin";
import {
  parseDeviceContext,
  type DeviceContext,
} from "@/lib/auth/two-factor-server";

export interface AuthenticatedRequest {
  uid: string;
  email?: string;
  device: DeviceContext | null;
}

function getVerifyIdTokenErrorMessage(error: unknown): string {
  if (isCredentialError(error)) {
    return CREDENTIAL_SETUP_MESSAGE;
  }

  const code = (error as { code?: string })?.code;
  const message = error instanceof Error ? error.message : String(error);

  if (code === "auth/id-token-expired") {
    return "Sessão expirada. Faça login novamente.";
  }
  if (code === "auth/argument-error") {
    return "Token malformado.";
  }
  if (code === "app/invalid-credential" || message.includes("Invalid PEM")) {
    return CREDENTIAL_SETUP_MESSAGE;
  }
  if (message.includes("aud") || message.includes("audience")) {
    return "Configuração Firebase inconsistente (projectId).";
  }

  return "Token inválido.";
}

export async function authenticateRequest(
  request: NextRequest,
): Promise<AuthenticatedRequest | Response> {
  try {
    const authHeader = request.headers.get("Authorization");
    const idToken = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    if (!idToken) {
      return new Response(JSON.stringify({ error: "Não autenticado." }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const decoded = await getAdminAuth().verifyIdToken(idToken);
    const device = parseDeviceContext(
      request.headers.get("X-Waitless-Device-Id"),
      request.headers.get("X-Waitless-User-Agent"),
    );

    return {
      uid: decoded.uid,
      email: decoded.email,
      device,
    };
  } catch (error) {
    const code = (error as { code?: string })?.code;
    const message = error instanceof Error ? error.message : String(error);
    console.error("[api-auth] verifyIdToken", { code, message });

    return new Response(
      JSON.stringify({ error: getVerifyIdTokenErrorMessage(error) }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
