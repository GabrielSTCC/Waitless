"use client";

import { auth } from "@/lib/firebase/config";
import { fetchAppCheckToken } from "@/lib/firebase/init-app-check";

export type AppCheckServerVerifyResponse = {
  valid: boolean;
  appId?: string;
  expectedAppId?: string;
  error?: string;
};

export async function verifyAppCheckTokenWithServer(
  forceRefresh = true,
): Promise<AppCheckServerVerifyResponse | null> {
  const token = await fetchAppCheckToken(forceRefresh);
  if (!token) return null;

  const idToken = await auth.currentUser?.getIdToken();
  if (!idToken) return null;

  const response = await fetch("/api/admin/app-check-verify", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ appCheckToken: token }),
  });

  if (!response.ok) return null;
  return (await response.json()) as AppCheckServerVerifyResponse;
}
