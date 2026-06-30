import { getAppCheck } from "firebase-admin/app-check";
import { getAdminApp } from "@/lib/firebase/admin";

export type AppCheckVerifyResult =
  | { valid: true; appId: string }
  | { valid: false; error: string };

export async function verifyAppCheckTokenServer(token: string): Promise<AppCheckVerifyResult> {
  try {
    getAdminApp();
    const decoded = await getAppCheck().verifyToken(token);
    return { valid: true, appId: decoded.appId };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { valid: false, error: message };
  }
}
