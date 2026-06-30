const STORAGE_BUCKET = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "";

/** Firebase Storage URLs must not use authDomain (*.firebaseapp.com) as bucket. */
export function isValidCompanyLogoUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return true;

  try {
    const parsed = new URL(trimmed);
    if (!parsed.hostname.includes("firebasestorage.googleapis.com")) {
      return true;
    }

    const bucketMatch = parsed.pathname.match(/\/b\/([^/]+)\//);
    if (!bucketMatch) return false;

    const bucket = decodeURIComponent(bucketMatch[1]);
    if (bucket.endsWith(".firebaseapp.com")) return false;
    if (STORAGE_BUCKET && bucket !== STORAGE_BUCKET) return false;

    const objectPath = decodeURIComponent(
      bucketMatch.input?.split("/o/")[1]?.split("?")[0] ?? "",
    );
    return objectPath.startsWith("companies/") && objectPath.includes("/brand/");
  } catch {
    return false;
  }
}

export function sanitizeLogoUrl(url: string | undefined): string {
  if (!url) return "";
  return isValidCompanyLogoUrl(url) ? url : "";
}
