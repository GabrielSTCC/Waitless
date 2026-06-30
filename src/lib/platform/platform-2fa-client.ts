const PLATFORM_2FA_STORAGE_KEY = "waitless-platform-2fa";

export function storePlatform2faPending(input: {
  challengeId: string;
  idToken: string;
}) {
  sessionStorage.setItem(PLATFORM_2FA_STORAGE_KEY, JSON.stringify(input));
}

export function getPlatform2faPending(): { challengeId: string; idToken: string } | null {
  const raw = sessionStorage.getItem(PLATFORM_2FA_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { challengeId?: string; idToken?: string };
    if (parsed.challengeId && parsed.idToken) {
      return { challengeId: parsed.challengeId, idToken: parsed.idToken };
    }
  } catch {
    // ignore
  }
  return null;
}

export function clearPlatform2faPending() {
  sessionStorage.removeItem(PLATFORM_2FA_STORAGE_KEY);
}
