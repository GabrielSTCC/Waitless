import type { MemberRole, Company } from "@/lib/types";

export type InviteRole = "admin" | "base";

const ADMIN_ROUTES = ["/admin/analytics", "/admin/settings"];
const OWNER_ROUTES = ["/admin/account"];

const SUSPENDED_ALLOWED_ROUTES = [
  "/admin/account",
  "/admin/security",
  "/admin/accessibility",
  "/admin/help",
  "/admin/auth",
  "/admin/auth/verify-2fa",
  "/admin/onboarding",
  "/admin/welcome",
  "/admin/login",
  "/admin/signup",
];

export function isCompanyOperationallyBlocked(company: Company | null | undefined): boolean {
  const status = company?.platformControl?.status ?? "active";
  return status === "suspended" || status === "paused";
}

export function canAccessRouteWhenSuspended(pathname: string): boolean {
  return SUSPENDED_ALLOWED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export function normalizeRole(role: string | undefined): MemberRole {
  if (role === "owner" || role === "admin" || role === "base") return role;
  if (role === "staff") return "base";
  return "base";
}

export function getRoleLabel(role: MemberRole | string | undefined): string {
  const normalized = normalizeRole(role);
  switch (normalized) {
    case "owner":
      return "Dono";
    case "admin":
      return "Admin";
    case "base":
      return "Base";
    default:
      return "Base";
  }
}

export function canManageCompany(role: MemberRole | string | undefined): boolean {
  const normalized = normalizeRole(role);
  return normalized === "owner" || normalized === "admin";
}

export function canManageTeam(userId: string, companyOwnerId: string): boolean {
  return userId === companyOwnerId;
}

export function isOwnerRoute(pathname: string): boolean {
  return OWNER_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export function canAccessOwnerRoute(
  userId: string | undefined,
  companyOwnerId: string | undefined,
  pathname: string,
): boolean {
  if (!isOwnerRoute(pathname)) return true;
  return !!userId && userId === companyOwnerId;
}

export function canAccessRoute(
  role: MemberRole | string | undefined,
  pathname: string,
  options?: { userId?: string; companyOwnerId?: string; company?: Company | null },
): boolean {
  if (
    options?.company &&
    isCompanyOperationallyBlocked(options.company) &&
    !canAccessRouteWhenSuspended(pathname)
  ) {
    return false;
  }

  if (
    OWNER_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))
  ) {
    return canAccessOwnerRoute(options?.userId, options?.companyOwnerId, pathname);
  }

  const normalized = normalizeRole(role);
  if (ADMIN_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))) {
    return canManageCompany(normalized);
  }
  return normalized === "owner" || normalized === "admin" || normalized === "base";
}

export function canUploadLogo(
  role: MemberRole | string | undefined,
  userId: string,
  companyOwnerId: string,
): boolean {
  return userId === companyOwnerId || canManageCompany(role);
}
