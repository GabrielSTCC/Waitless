/** Rotas tenant que usam Bearer mas ainda não podem exigir MFA (bootstrap 2FA / sessão). */
export function isMfaExemptPath(pathname: string): boolean {
  if (pathname.startsWith("/api/auth/2fa/")) return true;
  if (pathname === "/api/auth/session") return true;
  if (pathname === "/api/auth/onboarding") return true;
  return false;
}
