export const PROTECTION_ADVISORY_DISMISS_KEY = "waitless-protection-advisory-dismissed";

const EXEMPT_PATH_PREFIXES = [
  "/admin/auth",
  "/admin/login",
  "/admin/signup",
  "/admin/onboarding",
  "/admin/welcome",
];

export function isAdminProtectedPath(pathname: string): boolean {
  if (pathname === "/admin" || pathname === "/admin/") return true;
  if (!pathname.startsWith("/admin/")) return false;
  return !EXEMPT_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function shouldShowProtectionAdvisory(
  hostname: string,
  forceShow = process.env.NEXT_PUBLIC_SHOW_PROTECTION_ADVISORY === "true",
): boolean {
  if (forceShow) return true;
  return hostname !== "localhost" && hostname !== "127.0.0.1";
}

export function isProtectionAdvisoryDismissed(): boolean {
  if (typeof sessionStorage === "undefined") return false;
  try {
    return sessionStorage.getItem(PROTECTION_ADVISORY_DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

export function dismissProtectionAdvisory(): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(PROTECTION_ADVISORY_DISMISS_KEY, "1");
  } catch {
    // sessionStorage may be unavailable
  }
}
