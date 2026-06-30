"use client";

import { auth } from "@/lib/firebase/config";
import { fetchAppCheckToken } from "@/lib/firebase/init-app-check";

export type FirestoreRestProbeClientResult = {
  restOk: boolean;
  memberExists: boolean;
  permissionDenied: boolean;
  testedAuth: boolean;
  testedAppCheck: boolean;
  status?: number;
  authOnlyOk?: boolean;
  authOnlyStatus?: number;
  authOnlyPermissionDenied?: boolean;
  authOnlyMemberExists?: boolean;
  projectIdUsed?: string;
  idTokenAud?: string | null;
  projectIdMatchesAud?: boolean;
  error?: string;
};

export async function probeFirestoreRestViaApi(
  forceRefreshAppCheck = false,
): Promise<FirestoreRestProbeClientResult | null> {
  const user = auth.currentUser;
  if (!user) return null;

  const idToken = await user.getIdToken(true);
  const appCheckToken = await fetchAppCheckToken(forceRefreshAppCheck);

  const response = await fetch("/api/admin/firestore-probe", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ appCheckToken: appCheckToken ?? undefined }),
  });

  if (!response.ok) return null;
  return (await response.json()) as FirestoreRestProbeClientResult;
}

export function decodeIdTokenAud(idToken: string): string | null {
  try {
    const payload = idToken.split(".")[1];
    if (!payload) return null;
    const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))) as {
      aud?: string;
    };
    return decoded.aud ?? null;
  } catch {
    return null;
  }
}
