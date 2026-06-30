import {
  getToken,
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
  type AppCheck,
} from "firebase/app-check";
import type { FirebaseApp } from "firebase/app";

let appCheckInstance: AppCheck | null = null;
let appCheckTokenPromise: Promise<void> | null = null;
let appCheckClientInitStarted = false;
let boundFirebaseApp: FirebaseApp | null = null;

function isLocalhost() {
  return (
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
  );
}

export function isAppCheckSiteKeyPresent(): boolean {
  return !!process.env.NEXT_PUBLIC_FIREBASE_APP_CHECK_RECAPTCHA_SITE_KEY;
}

/** Deve rodar antes de getFirestore() no client (Firebase exige App Check primeiro). */
export function initAppCheckIfBrowser(app: FirebaseApp): AppCheck | null {
  if (typeof window === "undefined") {
    return appCheckInstance;
  }

  const siteKey = process.env.NEXT_PUBLIC_FIREBASE_APP_CHECK_RECAPTCHA_SITE_KEY;
  if (!siteKey) return null;

  if (appCheckInstance && boundFirebaseApp && boundFirebaseApp.name !== app.name) {
    appCheckInstance = null;
    appCheckTokenPromise = null;
    appCheckClientInitStarted = false;
  }

  if (appCheckInstance) {
    return appCheckInstance;
  }

  const debugToken = process.env.NEXT_PUBLIC_FIREBASE_APP_CHECK_DEBUG_TOKEN;
  if (debugToken) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken;
  } else if (isLocalhost() && process.env.NODE_ENV === "development") {
    console.warn(
      "[App Check] Em localhost, adicione NEXT_PUBLIC_FIREBASE_APP_CHECK_DEBUG_TOKEN no .env.local.",
    );
  }

  boundFirebaseApp = app;
  appCheckInstance = initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(siteKey),
    isTokenAutoRefreshEnabled: true,
  });

  appCheckTokenPromise = getToken(appCheckInstance, false)
    .then(() => undefined)
    .catch((error: unknown) => {
      appCheckTokenPromise = null;
      console.warn("[App Check] Falha ao pré-aquecer token:", error);
    });

  return appCheckInstance;
}

export function getAppCheckInstance(): AppCheck | null {
  return appCheckInstance;
}

export function invalidateAppCheckTokenCache(): void {
  appCheckTokenPromise = null;
}

export function markAppCheckClientInitStarted(): void {
  appCheckClientInitStarted = true;
}

export function wasAppCheckClientInitStarted(): boolean {
  return appCheckClientInitStarted;
}

export function resetAppCheckForRecovery(): void {
  appCheckInstance = null;
  appCheckTokenPromise = null;
  appCheckClientInitStarted = false;
  boundFirebaseApp = null;
}

export async function probeAppCheckToken(
  forceRefresh = false,
): Promise<{ tokenObtained: boolean; tokenLength: number }> {
  const token = await fetchAppCheckToken(forceRefresh);
  return {
    tokenObtained: !!token,
    tokenLength: token?.length ?? 0,
  };
}

export async function fetchAppCheckToken(forceRefresh = false): Promise<string | null> {
  if (typeof window === "undefined" || !appCheckInstance) {
    return null;
  }

  try {
    const result = await getToken(appCheckInstance, forceRefresh);
    return result.token ?? null;
  } catch {
    return null;
  }
}

export function waitForAppCheckToken(forceRefresh = false): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();

  const siteKey = process.env.NEXT_PUBLIC_FIREBASE_APP_CHECK_RECAPTCHA_SITE_KEY;
  if (!siteKey) {
    return Promise.reject(
      new Error("[App Check] NEXT_PUBLIC_FIREBASE_APP_CHECK_RECAPTCHA_SITE_KEY ausente."),
    );
  }

  if (!appCheckInstance) {
    return Promise.reject(new Error("[App Check] Não inicializado antes do Firestore."));
  }

  if (!forceRefresh && appCheckTokenPromise) {
    return appCheckTokenPromise;
  }

  appCheckTokenPromise = getToken(appCheckInstance, forceRefresh)
    .then(() => undefined)
    .catch((error: unknown) => {
      appCheckTokenPromise = null;
      throw error;
    });

  return appCheckTokenPromise;
}
