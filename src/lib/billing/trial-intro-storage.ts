const TRIAL_WELCOME_DISMISS_PREFIX = "waitless-trial-welcome-dismissed:";

function storageKey(companyId: string): string {
  return `${TRIAL_WELCOME_DISMISS_PREFIX}${companyId}`;
}

export function isTrialWelcomeDismissed(companyId: string): boolean {
  if (typeof sessionStorage === "undefined") return false;
  try {
    return sessionStorage.getItem(storageKey(companyId)) === "1";
  } catch {
    return false;
  }
}

export function dismissTrialWelcome(companyId: string): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(storageKey(companyId), "1");
  } catch {
    // sessionStorage may be unavailable
  }
}
