const FIRESTORE_REST_BASE = "https://firestore.googleapis.com/v1";

export type FirestoreRestProbeResult = {
  restOk: boolean;
  memberExists: boolean;
  permissionDenied: boolean;
  status: number;
  testedAuth: boolean;
  testedAppCheck: boolean;
  error?: string;
};

export async function probeFirestoreMemberRest(
  projectId: string,
  uid: string,
  idToken: string,
  appCheckToken?: string | null,
): Promise<FirestoreRestProbeResult> {
  const url = `${FIRESTORE_REST_BASE}/projects/${projectId}/databases/(default)/documents/members/${encodeURIComponent(uid)}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${idToken}`,
  };

  if (appCheckToken) {
    headers["X-Firebase-AppCheck"] = appCheckToken;
  }

  try {
    const response = await fetch(url, { headers, cache: "no-store" });
    const permissionDenied = response.status === 403;

    if (!response.ok) {
      let error: string | undefined;
      try {
        const body = (await response.json()) as { error?: { message?: string } };
        error = body.error?.message;
      } catch {
        error = response.statusText;
      }

      return {
        restOk: false,
        memberExists: false,
        permissionDenied,
        status: response.status,
        testedAuth: true,
        testedAppCheck: !!appCheckToken,
        error,
      };
    }

    const body = (await response.json()) as { name?: string; fields?: Record<string, unknown> };
    return {
      restOk: true,
      memberExists: !!body.fields,
      permissionDenied: false,
      status: response.status,
      testedAuth: true,
      testedAppCheck: !!appCheckToken,
    };
  } catch (error) {
    return {
      restOk: false,
      memberExists: false,
      permissionDenied: false,
      status: 0,
      testedAuth: true,
      testedAppCheck: !!appCheckToken,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
