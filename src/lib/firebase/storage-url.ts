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

    const bucketMatch = /\/b\/([^/]+)\//.exec(parsed.pathname);
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

/** URL de download do bucket do projeto, só em companies/{id}/brand/. */
export function parseOwnStorageLogoUrl(
  url: string,
): { companyId: string } | null {
  const trimmed = url.trim();
  if (!STORAGE_BUCKET) return null;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:") return null;
    if (parsed.hostname !== "firebasestorage.googleapis.com") return null;

    const bucketMatch = parsed.pathname.match(/^\/v0\/b\/([^/]+)\/o\/(.+)$/);
    if (!bucketMatch) return null;

    const bucket = decodeURIComponent(bucketMatch[1]);
    if (bucket !== STORAGE_BUCKET) return null;

    const objectPath = decodeURIComponent(bucketMatch[2]);
    const pathMatch = objectPath.match(/^companies\/([^/]+)\/brand\/[^/]+$/);
    if (!pathMatch?.[1]) return null;

    return { companyId: pathMatch[1] };
  } catch {
    return null;
  }
}

export function sanitizeLogoUrl(url: string | undefined): string {
  if (!url) return "";
  return isValidCompanyLogoUrl(url) ? url : "";
}
