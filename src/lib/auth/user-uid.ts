import { createHash } from "node:crypto";

const MAX_UID_LENGTH = 128;

/**
 * Gera um UID Firebase legível a partir do e-mail (sem caracteres aleatórios).
 * Ex.: user@example.com → user_at_example_com
 */
export function userUidFromEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  const atIndex = normalized.indexOf("@");
  const localPart = atIndex >= 0 ? normalized.slice(0, atIndex) : normalized;
  const domainPart = atIndex >= 0 ? normalized.slice(atIndex + 1) : "unknown";

  const safeLocal = sanitizeUidSegment(localPart) || "user";
  const safeDomain = sanitizeUidSegment(domainPart) || "unknown";
  const uid = `${safeLocal}_at_${safeDomain}`;

  if (uid.length <= MAX_UID_LENGTH) {
    return uid;
  }

  const hash = createHash("sha256").update(normalized).digest("hex").slice(0, 8);
  const budget = MAX_UID_LENGTH - hash.length - 1;
  return `${uid.slice(0, budget)}_${hash}`;
}

function trimEdges(value: string, char: string): string {
  let start = 0;
  let end = value.length;
  while (start < end && value[start] === char) start += 1;
  while (end > start && value[end - 1] === char) end -= 1;
  return value.slice(start, end);
}
function sanitizeUidSegment(value: string): string {
  return trimEdges(value.replace(/[^a-z0-9]+/g, "_").replace(/_+/g, "_"), "_");
}

export function isReadableUserUid(uid: string): boolean {
  return /^[a-z0-9]+(_at_[a-z0-9_]+)?(_[a-f0-9]{8})?$/.test(uid);
}
