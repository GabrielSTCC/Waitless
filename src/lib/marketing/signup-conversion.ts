const SIGNUP_CONVERSION_PENDING_KEY = "waitless-signup-conversion-pending";

export function markSignupConversionPending(): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(SIGNUP_CONVERSION_PENDING_KEY, "1");
  } catch {
    // sessionStorage may be unavailable
  }
}

export function isSignupConversionPending(): boolean {
  if (typeof sessionStorage === "undefined") return false;
  try {
    return sessionStorage.getItem(SIGNUP_CONVERSION_PENDING_KEY) === "1";
  } catch {
    return false;
  }
}

export function consumeSignupConversionPending(): boolean {
  if (typeof sessionStorage === "undefined") return false;
  try {
    const pending = sessionStorage.getItem(SIGNUP_CONVERSION_PENDING_KEY) === "1";
    if (pending) {
      sessionStorage.removeItem(SIGNUP_CONVERSION_PENDING_KEY);
    }
    return pending;
  } catch {
    return false;
  }
}

export function buildWelcomeRedirectUrl(returnTo: string | null): string {
  if (returnTo) {
    return `/admin/welcome?returnTo=${encodeURIComponent(returnTo)}`;
  }
  return "/admin/welcome";
}
