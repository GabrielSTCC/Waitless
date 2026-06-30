const ADMIN_PREFIX = "/admin/";

export function isSafeReturnTo(path: string): boolean {
  if (!path.startsWith(ADMIN_PREFIX)) return false;
  if (path.includes("://")) return false;
  if (path.startsWith("//")) return false;
  return true;
}

export function getReturnToParam(searchParams: URLSearchParams): string | null {
  const raw = searchParams.get("returnTo");
  if (!raw) return null;
  try {
    const decoded = decodeURIComponent(raw);
    return isSafeReturnTo(decoded) ? decoded : null;
  } catch {
    return null;
  }
}

export function buildAuthRedirectUrl(returnPath: string): string {
  return `/admin/auth?returnTo=${encodeURIComponent(returnPath)}`;
}
