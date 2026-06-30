"use client";

export function isPermissionDeniedError(error: unknown): boolean {
  const code = (error as { code?: string })?.code;
  if (code === "permission-denied") return true;
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("Missing or insufficient permissions") ||
    message.includes("permission-denied")
  );
}

export function isNetworkBlockedError(error: unknown): boolean {
  const code = (error as { code?: string })?.code;
  if (
    code === "unavailable" ||
    code === "deadline-exceeded" ||
    code === "firestore/timeout"
  ) {
    return true;
  }

  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("ERR_BLOCKED_BY_CLIENT") ||
    message.includes("firestore/timeout") ||
    message.includes("Failed to get document because the client is offline") ||
    message.includes("client is offline") ||
    message.includes("Could not reach Cloud Firestore backend") ||
    (message.includes("network") && !message.includes("permission"))
  );
}
