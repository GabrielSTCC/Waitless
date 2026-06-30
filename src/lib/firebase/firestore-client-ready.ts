import { auth, ensureDb } from "@/lib/firebase/config";
import { doc, getDoc } from "firebase/firestore";
import {
  ensureAppCheckToken,
  isAppCheckMisconfigured,
} from "@/lib/firebase/app-check";
import { isPermissionDeniedError } from "@/lib/firebase/firestore-connectivity";

const RETRY_DELAYS_MS = [0, 500];

let lastDiagnosticSignature: string | null = null;

function logDiagnostic(context: string, details: Record<string, unknown>): void {
  if (process.env.NODE_ENV !== "development") return;

  const signature = JSON.stringify({ context, ...details });
  if (signature === lastDiagnosticSignature) return;
  lastDiagnosticSignature = signature;
  console.warn("[FirestoreClient]", context, details);
}

export function isFirestoreClientMisconfigured(): boolean {
  return isAppCheckMisconfigured();
}

export function getSdkCredentialDesync(): boolean {
  return false;
}

export function clearSdkCredentialDesync(): void {
  // Mantido por compatibilidade; desync não bloqueia mais o app.
}

async function probeMemberRead(userId: string): Promise<boolean> {
  try {
    const db = await ensureDb();
    await getDoc(doc(db, "members", userId));
    return true;
  } catch (error) {
    if (isPermissionDeniedError(error)) {
      logDiagnostic("probeMemberRead", {
        success: false,
        errorCode: "permission-denied",
      });
      return false;
    }
    return false;
  }
}

async function attemptFirestoreClientReady(
  user: NonNullable<typeof auth.currentUser>,
  forceRefresh: boolean,
): Promise<boolean> {
  if (isAppCheckMisconfigured()) return false;

  try {
    await user.getIdToken(forceRefresh);
  } catch {
    return false;
  }

  const tokenReady = await ensureAppCheckToken(forceRefresh);
  if (!tokenReady) return false;

  return probeMemberRead(user.uid);
}

export async function waitForFirestoreClient(forceRefresh = false): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (isAppCheckMisconfigured()) return false;

  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user) return false;

  try {
    await ensureDb();
  } catch {
    return false;
  }

  for (let attempt = 0; attempt < RETRY_DELAYS_MS.length; attempt++) {
    if (RETRY_DELAYS_MS[attempt] > 0) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
    }

    const refresh = attempt > 0 || forceRefresh;
    if (await attemptFirestoreClientReady(user, refresh)) {
      lastDiagnosticSignature = null;
      return true;
    }
  }

  return false;
}
