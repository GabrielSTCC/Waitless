"use client";

import {
  getAppCheckInstance,
  initAppCheckIfBrowser,
  isAppCheckSiteKeyPresent,
  markAppCheckClientInitStarted,
  probeAppCheckToken,
  wasAppCheckClientInitStarted,
  waitForAppCheckToken,
} from "@/lib/firebase/init-app-check";
import { getFirebaseApp } from "@/lib/firebase/config";

function isLocalhost(): boolean {
  return (
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
  );
}

function hasDebugToken(): boolean {
  return !!process.env.NEXT_PUBLIC_FIREBASE_APP_CHECK_DEBUG_TOKEN;
}

function ensureInitStarted(): void {
  if (typeof window === "undefined" || wasAppCheckClientInitStarted()) return;
  markAppCheckClientInitStarted();
  initAppCheckIfBrowser(getFirebaseApp());
}

export function isAppCheckMisconfigured(): boolean {
  if (typeof window === "undefined") return false;
  if (isLocalhost()) return false;
  return !isAppCheckSiteKeyPresent();
}

export type AppCheckDiagnostics = {
  siteKeyPresent: boolean;
  appCheckInstancePresent: boolean;
  tokenObtained: boolean;
  tokenLength: number;
  serverTokenValid?: boolean | null;
  serverVerifyError?: string | null;
};

export async function getAppCheckDiagnostics(
  forceRefresh = false,
): Promise<AppCheckDiagnostics> {
  const siteKeyPresent = isAppCheckSiteKeyPresent();
  ensureInitStarted();
  const appCheckInstancePresent = getAppCheckInstance() !== null;

  if (!appCheckInstancePresent) {
    return {
      siteKeyPresent,
      appCheckInstancePresent: false,
      tokenObtained: false,
      tokenLength: 0,
    };
  }

  const tokenProbe = await probeAppCheckToken(forceRefresh);
  const base = {
    siteKeyPresent,
    appCheckInstancePresent: true,
    tokenObtained: tokenProbe.tokenObtained,
    tokenLength: tokenProbe.tokenLength,
  };

  if (!tokenProbe.tokenObtained || typeof window === "undefined") {
    return base;
  }

  const { verifyAppCheckTokenWithServer } = await import(
    "@/lib/firebase/app-check-client-verify"
  );
  const serverVerify = await verifyAppCheckTokenWithServer(forceRefresh);

  return {
    ...base,
    serverTokenValid: serverVerify?.valid ?? null,
    serverVerifyError: serverVerify?.error ?? null,
  };
}

export function initFirebaseAppCheck(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();

  if (!isAppCheckSiteKeyPresent()) {
    if (isLocalhost() && hasDebugToken()) {
      console.warn(
        "[App Check] Site key ausente; em localhost use NEXT_PUBLIC_FIREBASE_APP_CHECK_RECAPTCHA_SITE_KEY ou emulador.",
      );
    } else if (!isLocalhost()) {
      console.warn("[App Check] NEXT_PUBLIC_FIREBASE_APP_CHECK_RECAPTCHA_SITE_KEY ausente.");
    }
    return Promise.resolve();
  }

  ensureInitStarted();
  return waitForAppCheckToken(false).catch((error) => {
    console.error("[App Check] Falha ao obter token:", error);
    throw error;
  });
}

/** Aguarda o token App Check antes de leituras Firestore autenticadas. */
export function awaitAppCheckReady(): Promise<void> {
  return initFirebaseAppCheck();
}

/** Obtém token App Check; retorna false se indisponível (ex.: reCAPTCHA bloqueado). */
export async function ensureAppCheckToken(forceRefresh = false): Promise<boolean> {
  if (typeof window === "undefined") return false;

  if (!isAppCheckSiteKeyPresent()) {
    if (isLocalhost()) {
      return hasDebugToken();
    }
    console.warn("[App Check] NEXT_PUBLIC_FIREBASE_APP_CHECK_RECAPTCHA_SITE_KEY ausente.");
    return false;
  }

  try {
    ensureInitStarted();
    if (!getAppCheckInstance()) return false;
    await waitForAppCheckToken(forceRefresh);
    return true;
  } catch (error) {
    console.warn("[App Check] Token indisponível:", error);
    return false;
  }
}
