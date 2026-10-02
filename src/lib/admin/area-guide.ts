import { isAdminProtectedPath } from "@/lib/admin/protection-advisory";

export type AreaGuideId =
  | "queue"
  | "appointments"
  | "customers"
  | "analytics"
  | "settings"
  | "accessibility"
  | "security"
  | "account";

export const AREA_GUIDE_AUTO_PREFIX = "waitless-area-guides-auto:";
export const AREA_GUIDE_SEEN_PREFIX = "waitless-area-guide-seen:";

const AREA_PATHS: Record<AreaGuideId, string> = {
  queue: "/admin",
  appointments: "/admin/appointments",
  customers: "/admin/customers",
  analytics: "/admin/analytics",
  settings: "/admin/settings",
  accessibility: "/admin/accessibility",
  security: "/admin/security",
  account: "/admin/account",
};

export function normalizeAdminPath(pathname: string): string {
  if (pathname === "/admin/" || pathname === "/admin") return "/admin";
  return pathname.replace(/\/$/, "") || pathname;
}

export function resolveAreaId(pathname: string): AreaGuideId | null {
  if (!isAdminProtectedPath(pathname)) return null;
  const normalized = normalizeAdminPath(pathname);

  for (const [id, path] of Object.entries(AREA_PATHS) as [AreaGuideId, string][]) {
    if (normalized === path) return id;
  }
  return null;
}

function autoKey(uid: string): string {
  return `${AREA_GUIDE_AUTO_PREFIX}${uid}`;
}

function seenKey(uid: string, areaId: AreaGuideId): string {
  return `${AREA_GUIDE_SEEN_PREFIX}${uid}:${areaId}`;
}

export function isAreaGuideAutoEnabled(uid: string): boolean {
  if (typeof localStorage === "undefined" || !uid) return false;
  try {
    return localStorage.getItem(autoKey(uid)) === "1";
  } catch {
    return false;
  }
}

export function enableAreaGuideAuto(uid: string): void {
  if (typeof localStorage === "undefined" || !uid) return;
  try {
    localStorage.setItem(autoKey(uid), "1");
  } catch {
    // localStorage may be unavailable
  }
}

export function isAreaGuideSeen(uid: string, areaId: AreaGuideId): boolean {
  if (typeof localStorage === "undefined" || !uid) return false;
  try {
    return localStorage.getItem(seenKey(uid, areaId)) === "1";
  } catch {
    return false;
  }
}

export function markAreaGuideSeen(uid: string, areaId: AreaGuideId): void {
  if (typeof localStorage === "undefined" || !uid) return;
  try {
    localStorage.setItem(seenKey(uid, areaId), "1");
  } catch {
    // localStorage may be unavailable
  }
}

export function shouldAutoOpenAreaGuide(uid: string, areaId: AreaGuideId): boolean {
  return isAreaGuideAutoEnabled(uid) && !isAreaGuideSeen(uid, areaId);
}
